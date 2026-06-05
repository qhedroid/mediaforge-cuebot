import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

const maxDurationSeconds = 900;

export class YtDlpError extends Error {
  constructor(
    readonly code: "ytdlp_missing" | "duration_too_long" | "download_failed" | "metadata_failed",
    message: string
  ) {
    super(message);
    this.name = "YtDlpError";
  }
}

function getYtDlpExecutable(): string {
  return process.env.YTDLP_PATH ?? "yt-dlp";
}

interface YtDlpMetadataJson {
  title?: string;
  duration?: number;
}

function runYtDlpProcess(executable: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });

    const output: string[] = [];
    const errors: string[] = [];

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => errors.push(chunk));

    child.on("error", (error) => {
      const errnoError = error as NodeJS.ErrnoException;

      if (errnoError.code === "ENOENT") {
        reject(
          new YtDlpError(
            "ytdlp_missing",
            "yt-dlp could not be found. Install yt-dlp or set YTDLP_PATH in your root .env."
          )
        );
      } else {
        reject(
          new YtDlpError("download_failed", `yt-dlp failed to start: ${error.message}`)
        );
      }
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.join(""));
        return;
      }

      reject(
        new YtDlpError(
          "download_failed",
          "CueBot could not prepare that URL. Check the URL is supported and legally permitted."
        )
      );
    });
  });
}

export async function checkYtDlpAvailable(): Promise<void> {
  const executable = getYtDlpExecutable();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, ["--version"], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });

    child.on("error", (_error) => {
      reject(
        new YtDlpError(
          "ytdlp_missing",
          "yt-dlp could not be found. Install yt-dlp or set YTDLP_PATH in your root .env."
        )
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new YtDlpError(
            "ytdlp_missing",
            "yt-dlp could not be found. Install yt-dlp or set YTDLP_PATH in your root .env."
          )
        );
      }
    });
  });
}

export async function fetchYtDlpMetadata(
  url: string
): Promise<{ title: string; durationSeconds: number | undefined }> {
  const executable = getYtDlpExecutable();
  const hostname = safeHostname(url);
  console.log(`yt-dlp metadata started: host=${hostname}`);

  let rawJson: string;

  try {
    rawJson = await runYtDlpProcess(executable, [
      "--dump-json",
      "--no-playlist",
      url
    ]);
  } catch (error) {
    if (error instanceof YtDlpError) {
      throw error;
    }

    throw new YtDlpError(
      "metadata_failed",
      "yt-dlp could not fetch metadata for that URL."
    );
  }

  let parsed: YtDlpMetadataJson;

  try {
    parsed = JSON.parse(rawJson) as YtDlpMetadataJson;
  } catch {
    throw new YtDlpError(
      "metadata_failed",
      "yt-dlp returned unexpected metadata. The URL may not be supported."
    );
  }

  const title = parsed.title ?? hostname;
  const durationSeconds =
    typeof parsed.duration === "number" && Number.isFinite(parsed.duration)
      ? parsed.duration
      : undefined;

  console.log(
    `yt-dlp metadata completed: host=${hostname} title=${title} durationSeconds=${durationSeconds ?? "unknown"}`
  );

  return { title, durationSeconds };
}

export async function downloadViaYtDlp(
  url: string,
  outputDirectory: string,
  trackId: string
): Promise<{ filePath: string; title: string; durationSeconds: number | undefined }> {
  const hostname = safeHostname(url);

  await checkYtDlpAvailable();

  let title: string = hostname;
  let durationSeconds: number | undefined;

  try {
    const metadata = await fetchYtDlpMetadata(url);
    title = metadata.title;
    durationSeconds = metadata.durationSeconds;
  } catch (error) {
    if (error instanceof YtDlpError && error.code === "ytdlp_missing") {
      throw error;
    }

    if (error instanceof YtDlpError && error.code === "duration_too_long") {
      throw error;
    }

    console.log(`yt-dlp metadata failed, continuing with download: host=${hostname}`);
  }

  if (typeof durationSeconds === "number" && durationSeconds > maxDurationSeconds) {
    throw new YtDlpError(
      "duration_too_long",
      "This media is too long for the current MVP limit."
    );
  }

  const outputTemplate = path.join(outputDirectory, `${trackId}.%(ext)s`);

  console.log(`yt-dlp download started: host=${hostname}`);

  await runYtDlpProcess(getYtDlpExecutable(), [
    "--no-playlist",
    "--extract-audio",
    "--audio-format", "mp3",
    "--audio-quality", "5",
    "--output", outputTemplate,
    url
  ]);

  console.log(`yt-dlp download completed: host=${hostname}`);

  const downloadedFilePath = await findDownloadedFile(outputDirectory, trackId);

  if (!downloadedFilePath) {
    throw new YtDlpError(
      "download_failed",
      "CueBot could not prepare that URL. Check the URL is supported and legally permitted."
    );
  }

  console.log(`yt-dlp prepared file: path=${downloadedFilePath}`);

  return { filePath: downloadedFilePath, title, durationSeconds };
}

async function findDownloadedFile(
  directory: string,
  trackId: string
): Promise<string | null> {
  let entries: string[];

  try {
    entries = await readdir(directory);
  } catch {
    return null;
  }

  const match = entries.find((entry) => entry.startsWith(trackId));

  if (!match) {
    return null;
  }

  return path.join(directory, match);
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown-host";
  }
}
