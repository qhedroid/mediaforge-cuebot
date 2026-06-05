import type { PrepareOptions, QueueItem, UrlInput } from "@mediaforge/shared";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDiscordPlayableAudio } from "./conversion.service.js";

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
const maxDownloadSizeBytes = 100 * 1024 * 1024;
const maxDurationMs = 15 * 60 * 1000;
const tempFileLifetimeMs = 60 * 60 * 1000;
const downloadTimeoutMs = 60_000;
const maxDownloadAttempts = 2;

export type UrlIngestErrorCode =
  | "invalid_url"
  | "unsupported_url"
  | "download_timeout"
  | "duration_too_long"
  | "download_failed"
  | "probe_failed"
  | "conversion_failed";

export class UrlIngestError extends Error {
  constructor(
    readonly code: UrlIngestErrorCode,
    message: string
  ) {
    super(message);
    this.name = "UrlIngestError";
  }
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

function parseHttpUrl(url: string): URL {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new UrlIngestError("invalid_url", "Please provide a valid http or https media URL.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new UrlIngestError("invalid_url", "Please provide a valid http or https URL.");
  }

  return parsedUrl;
}

function getExtensionFromUrl(url: URL): string {
  return path.extname(url.pathname).toLowerCase();
}

function getExtensionFromContentType(contentType: string | null): string {
  const normalizedContentType = contentType?.split(";")[0]?.trim().toLowerCase();

  switch (normalizedContentType) {
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "audio/wav":
    case "audio/x-wav":
      return ".wav";
    case "audio/mp4":
    case "audio/m4a":
    case "audio/aac":
      return ".m4a";
    case "audio/ogg":
      return ".ogg";
    case "audio/webm":
    case "video/webm":
      return ".webm";
    case "video/mp4":
      return ".mp4";
    default:
      return "";
  }
}

function validateMediaType(url: URL, contentType: string | null): string {
  const extension = getExtensionFromUrl(url);
  const normalizedContentType = contentType?.split(";")[0]?.trim().toLowerCase();
  const contentTypeExtension = getExtensionFromContentType(contentType);

  if (
    !allowedExtensions.has(extension) &&
    (!normalizedContentType || !allowedContentTypes.has(normalizedContentType))
  ) {
    throw new UrlIngestError(
      "unsupported_url",
      "CueBot only supports direct permitted media file URLs right now. Resolver URLs such as YouTube are planned for a future MediaForge URL provider."
    );
  }

  return allowedExtensions.has(extension) ? extension : contentTypeExtension;
}

function validateSize(sizeBytes: number): void {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    throw new UrlIngestError("download_failed", "CueBot could not download that media URL. The host may block direct downloads or the URL may not point to a media file.");
  }

  if (sizeBytes > maxDownloadSizeBytes) {
    throw new UrlIngestError("download_failed", "Direct URL media is too large for the MVP limit.");
  }
}

async function deleteTempFileIfExists(filePath: string): Promise<void> {
  await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") {
      console.error(`URL ingest cleanup failed: ${error.message}`);
    }
  });
}

async function downloadDirectMedia(url: URL, outputPath: string): Promise<{
  filePath: string;
  sizeBytes: number;
}> {
  const extensionFromUrl = getExtensionFromUrl(url) || "unknown";
  let lastError: UrlIngestError | undefined;

  for (let attempt = 1; attempt <= maxDownloadAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), downloadTimeoutMs);

    try {
      console.log(`URL ingest download started: host=${url.hostname} extension=${extensionFromUrl} attempt=${attempt}/${maxDownloadAttempts}`);
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        console.error(`URL ingest response not ok: host=${url.hostname} status=${response.status}`);
        throw new UrlIngestError(
          "download_failed",
          "CueBot could not download that media URL. The host may block direct downloads or the URL may not point to a media file."
        );
      }

      const extension = validateMediaType(url, response.headers.get("content-type"));
      const contentLength = response.headers.get("content-length");
      const contentLengthBytes = contentLength ? Number(contentLength) : undefined;

      if (typeof contentLengthBytes === "number") {
        validateSize(contentLengthBytes);
        console.log(`URL ingest content length: host=${url.hostname} contentLength=${contentLengthBytes}`);
      }

      const bytes = await readResponseWithProgress(response, url.hostname, contentLengthBytes);
      validateSize(bytes.byteLength);
      const filePath = outputPath.replace(/\.download$/, extension);
      await writeFile(filePath, bytes);
      console.log(`URL ingest download completed: host=${url.hostname} sizeBytes=${bytes.byteLength} outputFilePath=${filePath}`);
      return { filePath, sizeBytes: bytes.byteLength };
    } catch (error) {
      lastError = classifyDownloadError(error);
      console.error(`URL ingest download failed: host=${url.hostname} attempt=${attempt}/${maxDownloadAttempts} code=${lastError.code} message=${lastError.message}`);

      if (attempt >= maxDownloadAttempts || lastError.code === "unsupported_url") {
        throw lastError;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new UrlIngestError("download_failed", "CueBot could not download that media URL. The host may block direct downloads or the URL may not point to a media file.");
}

function classifyDownloadError(error: unknown): UrlIngestError {
  if (error instanceof UrlIngestError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";

  if (name === "AbortError" || message.toLowerCase().includes("operation was aborted")) {
    return new UrlIngestError(
      "download_timeout",
      "CueBot timed out while downloading that media URL. Please try a smaller file or another direct media URL."
    );
  }

  return new UrlIngestError(
    "download_failed",
    "CueBot could not download that media URL. The host may block direct downloads or the URL may not point to a media file."
  );
}

async function readResponseWithProgress(
  response: Response,
  hostname: string,
  contentLength: number | undefined
): Promise<Buffer> {
  if (!response.body) {
    const bytes = Buffer.from(await response.arrayBuffer());
    validateSize(bytes.byteLength);
    return bytes;
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
    validateSize(downloadedBytes);

    const now = Date.now();

    if (now - lastLogAt >= 1000) {
      lastLogAt = now;
      console.log(formatDownloadProgress(hostname, downloadedBytes, contentLength));
    }
  }

  console.log(formatDownloadProgress(hostname, downloadedBytes, contentLength));
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

function formatDownloadProgress(
  hostname: string,
  downloadedBytes: number,
  contentLength: number | undefined
): string {
  if (typeof contentLength === "number" && contentLength > 0) {
    const percentage = Math.min(100, (downloadedBytes / contentLength) * 100);
    return `URL ingest download progress: host=${hostname} downloadedBytes=${downloadedBytes} contentLength=${contentLength} percentage=${percentage.toFixed(1)}`;
  }

  return `URL ingest download progress: host=${hostname} downloadedBytes=${downloadedBytes}`;
}

export async function prepareUrlInput(input: UrlInput, options: PrepareOptions = {}): Promise<QueueItem> {
  const parsedUrl = parseHttpUrl(input.url.trim());
  const id = randomUUID();
  const outputDirectory = resolveOutputDirectory(options.outputDirectory);
  await mkdir(outputDirectory, { recursive: true });

  const initialOutputPath = path.join(outputDirectory, `${id}.download`);
  let downloadedFilePath = initialOutputPath;

  try {
    const download = await downloadDirectMedia(parsedUrl, initialOutputPath);
    downloadedFilePath = download.filePath;
  } catch (error) {
    if (error instanceof UrlIngestError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new UrlIngestError("download_failed", `Direct URL download failed: ${message}`);
  }

  let playableAudio;

  try {
    playableAudio = await ensureDiscordPlayableAudio(downloadedFilePath, outputDirectory);
  } catch (error) {
    await deleteTempFileIfExists(downloadedFilePath);
    const message = error instanceof Error ? error.message : String(error);
    const code = message.toLowerCase().includes("ffprobe") ? "probe_failed" : "conversion_failed";
    throw new UrlIngestError(
      code,
      code === "probe_failed"
        ? "FFprobe could not inspect the downloaded media."
        : "FFmpeg could not prepare this media for playback."
    );
  }

  if (playableAudio.converted && playableAudio.preparedFilePath !== downloadedFilePath) {
    await deleteTempFileIfExists(downloadedFilePath);
  }

  if (typeof playableAudio.metadata.durationMs === "number" && playableAudio.metadata.durationMs > maxDurationMs) {
    await deleteTempFileIfExists(playableAudio.preparedFilePath);
    throw new UrlIngestError("duration_too_long", "This media is too long for the current MVP limit.");
  }

  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + tempFileLifetimeMs).toISOString();
  const title = decodeURIComponent(path.basename(parsedUrl.pathname)) || parsedUrl.hostname;

  return {
    id,
    guildId: options.guildId ?? "unknown-guild",
    requestedByUserId: options.requestedByUserId ?? "unknown-user",
    status: "ready",
    preparedFilePath: playableAudio.preparedFilePath,
    enqueuedAt: createdAt,
    metadata: {
      id,
      title,
      durationMs: playableAudio.metadata.durationMs,
      sourceType: "mediaforge_url",
      sourceUri: parsedUrl.toString(),
      preparedFilePath: playableAudio.preparedFilePath,
      createdAt,
      expiresAt
    }
  };
}

export class UrlIngestService {
  async prepareUrl(input: UrlInput, options: PrepareOptions = {}): Promise<QueueItem> {
    return prepareUrlInput(input, options);
  }
}
