import type { AttachmentInput, PrepareOptions, QueueItem } from "@mediaforge/shared";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

const allowedExtensions = new Set([".mp3", ".wav", ".m4a", ".ogg", ".webm", ".mp4"]);
const allowedContentTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
  "video/webm",
  "video/mp4"
]);
const maxAttachmentSizeBytes = 25 * 1024 * 1024;
const tempFileLifetimeMs = 60 * 60 * 1000;
const downloadTimeoutMs = 60_000;
const maxDownloadAttempts = 2;

export type AttachmentIngestErrorCode =
  | "missing_filename"
  | "missing_attachment_url"
  | "unsupported_file_type"
  | "file_too_large"
  | "invalid_content_length"
  | "download_timeout"
  | "download_aborted"
  | "download_failed";

export class AttachmentIngestError extends Error {
  constructor(
    readonly code: AttachmentIngestErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AttachmentIngestError";
  }
}

export function humanReadableFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = sizeBytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function findRepoRoot(startDirectory: string): string {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    if (existsSync(path.join(currentDirectory, "pnpm-workspace.yaml"))) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return path.resolve(startDirectory);
    }

    currentDirectory = parentDirectory;
  }
}

function resolveOutputDirectory(outputDirectory?: string): string {
  if (outputDirectory) {
    return path.resolve(outputDirectory);
  }

  return path.join(findRepoRoot(process.cwd()), "storage", "cuebot-temp");
}

function getNormalizedExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

function getSafeAttachmentLocator(input: AttachmentInput): string {
  const extension = getNormalizedExtension(input.filename) || "no-extension";

  try {
    const parsedUrl = new URL(input.url);
    return `${parsedUrl.hostname} ${extension}`;
  } catch {
    return `unknown-host ${extension}`;
  }
}

function validateAttachmentType(input: AttachmentInput): string {
  const extension = getNormalizedExtension(input.filename);
  const contentType = input.contentType?.toLowerCase();
  const hasAllowedExtension = allowedExtensions.has(extension);
  const hasAllowedContentType = contentType ? allowedContentTypes.has(contentType) : false;

  if (!hasAllowedExtension && !hasAllowedContentType) {
    throw new AttachmentIngestError(
      "unsupported_file_type",
      "Unsupported file type. Please attach mp3, wav, m4a, ogg, webm, or mp4."
    );
  }

  return hasAllowedExtension ? extension : ".bin";
}

function createSafeStoredFilename(originalFilename: string, extension: string, id: string): string {
  const parsedName = path.parse(originalFilename).name;
  const safeBaseName = parsedName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${id}-${safeBaseName || "attachment"}${extension}`;
}

function assertFileSize(sizeBytes: number | undefined): void {
  if (typeof sizeBytes === "number" && !Number.isFinite(sizeBytes)) {
    throw new AttachmentIngestError(
      "invalid_content_length",
      "Attachment reported an invalid file size."
    );
  }

  if (typeof sizeBytes === "number" && sizeBytes > maxAttachmentSizeBytes) {
    throw new AttachmentIngestError(
      "file_too_large",
      `File is too large. CueBot 0.1 accepts attachments up to ${humanReadableFileSize(maxAttachmentSizeBytes)}.`
    );
  }
}

function classifyDownloadError(error: unknown): AttachmentIngestError {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";

  if (name === "TimeoutError") {
    return new AttachmentIngestError(
      "download_timeout",
      "Attachment download timed out or was aborted. Please try again with a smaller file or retry the upload."
    );
  }

  if (name === "AbortError" || message.toLowerCase().includes("operation was aborted")) {
    return new AttachmentIngestError(
      "download_aborted",
      "Attachment download timed out or was aborted. Please try again with a smaller file or retry the upload."
    );
  }

  return new AttachmentIngestError("download_failed", `Attachment download failed: ${message}`);
}

async function fetchAttachmentBytes(input: AttachmentInput): Promise<{
  bytes: Buffer;
  contentLength?: number;
}> {
  let lastError: AttachmentIngestError | undefined;
  const safeLocator = getSafeAttachmentLocator(input);

  for (let attempt = 1; attempt <= maxDownloadAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), downloadTimeoutMs);

    try {
      console.log(`Attachment download attempt ${attempt}/${maxDownloadAttempts}: ${safeLocator}`);
      const response = await fetch(input.url, { signal: controller.signal });

      if (!response.ok) {
        throw new AttachmentIngestError(
          "download_failed",
          `Attachment download failed with status ${response.status}.`
        );
      }

      const contentLengthHeader = response.headers.get("content-length");
      const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
      assertFileSize(contentLength);
      const bytes = await readResponseWithProgress(response, safeLocator, contentLength);
      assertFileSize(bytes.byteLength);
      console.log(
        `Attachment download completed: ${safeLocator}, ${humanReadableFileSize(bytes.byteLength)}`
      );

      return { bytes, contentLength };
    } catch (error) {
      lastError = error instanceof AttachmentIngestError ? error : classifyDownloadError(error);
      console.error(
        `Attachment download attempt ${attempt}/${maxDownloadAttempts} failed: ${safeLocator}, ${lastError.code}: ${lastError.message}`
      );

      if (attempt >= maxDownloadAttempts || lastError.code === "file_too_large") {
        throw lastError;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new AttachmentIngestError("download_failed", "Attachment download failed.");
}

async function readResponseWithProgress(
  response: Response,
  safeLocator: string,
  contentLength: number | undefined
): Promise<Buffer> {
  if (!response.body) {
    return Buffer.from(await response.arrayBuffer());
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let downloadedBytes = 0;
  let lastLogAt = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    downloadedBytes += value.byteLength;
    assertFileSize(downloadedBytes);

    const now = Date.now();

    if (now - lastLogAt >= 1000) {
      lastLogAt = now;
      console.log(formatDownloadProgress(safeLocator, downloadedBytes, contentLength));
    }
  }

  console.log(formatDownloadProgress(safeLocator, downloadedBytes, contentLength));
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

function formatDownloadProgress(
  safeLocator: string,
  downloadedBytes: number,
  contentLength: number | undefined
): string {
  if (typeof contentLength === "number" && contentLength > 0) {
    const percentage = Math.min(100, (downloadedBytes / contentLength) * 100);
    return `Attachment download progress: ${safeLocator}, ${humanReadableFileSize(downloadedBytes)} / ${humanReadableFileSize(contentLength)} (${percentage.toFixed(1)}%)`;
  }

  return `Attachment download progress: ${safeLocator}, ${humanReadableFileSize(downloadedBytes)} downloaded`;
}

export async function prepareAttachmentInput(
  input: AttachmentInput,
  options: PrepareOptions = {}
): Promise<QueueItem> {
  if (!input.filename.trim()) {
    throw new AttachmentIngestError("missing_filename", "Attachment is missing a filename.");
  }

  if (!input.url.trim()) {
    throw new AttachmentIngestError("missing_attachment_url", "Attachment is missing a download URL.");
  }

  assertFileSize(input.sizeBytes);
  const extension = validateAttachmentType(input);
  const { bytes: downloadedBytes } = await fetchAttachmentBytes(input);

  const id = randomUUID();
  const outputDirectory = resolveOutputDirectory(options.outputDirectory);
  await mkdir(outputDirectory, { recursive: true });

  const storedFilename = createSafeStoredFilename(input.filename, extension, id);
  const preparedFilePath = path.join(outputDirectory, storedFilename);
  await writeFile(preparedFilePath, downloadedBytes);

  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + tempFileLifetimeMs).toISOString();
  const guildId = options.guildId ?? "unknown-guild";
  const requestedByUserId = options.requestedByUserId ?? "unknown-user";

  return {
    id,
    guildId,
    requestedByUserId,
    status: "ready",
    preparedFilePath,
    enqueuedAt: createdAt,
    metadata: {
      id,
      title: input.filename,
      sourceType: "discord_attachment",
      sourceUri: input.url,
      originalFileName: input.filename,
      mimeType: input.contentType,
      sizeBytes: downloadedBytes.byteLength,
      preparedFilePath,
      createdAt,
      expiresAt
    }
  };
}

export class AttachmentIngestService {
  async prepareAttachment(attachment: AttachmentInput, options: PrepareOptions = {}): Promise<QueueItem> {
    return prepareAttachmentInput(attachment, options);
  }
}
