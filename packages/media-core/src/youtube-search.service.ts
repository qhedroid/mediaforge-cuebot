import { spawn } from "node:child_process";
import type { ProviderTrack } from "@mediaforge/shared";

const maxQueryLength = 200;
const youtubeProviderId = "youtube";

export type YouTubeSearchErrorCode =
  | "ytdlp_missing"
  | "search_failed"
  | "no_results"
  | "invalid_query";

export class YouTubeSearchError extends Error {
  constructor(
    readonly code: YouTubeSearchErrorCode,
    message: string
  ) {
    super(message);
    this.name = "YouTubeSearchError";
  }
}

interface YtDlpSearchEntry {
  id?: string;
  title?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  webpage_url?: string;
  url?: string;
}

function getYtDlpExecutable(): string {
  return process.env.YTDLP_PATH ?? "yt-dlp";
}

function runSearchProcess(executable: string, args: string[]): Promise<string> {
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
          new YouTubeSearchError(
            "ytdlp_missing",
            "yt-dlp could not be found. Install yt-dlp or set YTDLP_PATH in your root .env."
          )
        );
      } else {
        reject(
          new YouTubeSearchError("search_failed", `yt-dlp failed to start: ${error.message}`)
        );
      }
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.join(""));
        return;
      }

      reject(
        new YouTubeSearchError(
          "search_failed",
          "YouTube search failed. Check your query and try again."
        )
      );
    });
  });
}

function resolvePageUrl(entry: YtDlpSearchEntry): string | undefined {
  if (entry.webpage_url && entry.webpage_url.startsWith("https://")) {
    return entry.webpage_url;
  }

  if (entry.id) {
    return `https://www.youtube.com/watch?v=${entry.id}`;
  }

  return undefined;
}

function parseNdjson(raw: string): YtDlpSearchEntry[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{"))
    .map((line) => {
      try {
        return JSON.parse(line) as YtDlpSearchEntry;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is YtDlpSearchEntry => entry !== null);
}

function entryToProviderTrack(entry: YtDlpSearchEntry): ProviderTrack | null {
  const id = entry.id;
  const title = entry.title;
  const pageUrl = resolvePageUrl(entry);

  if (!id || !title || !pageUrl) {
    return null;
  }

  const uploader = entry.uploader ?? entry.channel ?? undefined;
  const durationMs =
    typeof entry.duration === "number" && Number.isFinite(entry.duration) && entry.duration > 0
      ? Math.round(entry.duration * 1000)
      : undefined;

  return {
    id,
    providerId: youtubeProviderId,
    title,
    artist: uploader,
    durationMs,
    pageUrl,
    attributionText: "YouTube"
  };
}

export async function searchYouTube(
  query: string,
  limit = 5
): Promise<ProviderTrack[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    throw new YouTubeSearchError(
      "invalid_query",
      "Please provide a search query."
    );
  }

  if (trimmedQuery.length > maxQueryLength) {
    throw new YouTubeSearchError(
      "invalid_query",
      "Search query is too long. Please use a shorter query."
    );
  }

  const executable = getYtDlpExecutable();
  const searchTarget = `ytsearch${limit}:${trimmedQuery}`;

  console.log(`YouTube search started: limit=${limit}`);

  let rawOutput: string;

  try {
    rawOutput = await runSearchProcess(executable, [
      "--dump-json",
      "--flat-playlist",
      "--no-warnings",
      searchTarget
    ]);
  } catch (error) {
    if (error instanceof YouTubeSearchError) {
      throw error;
    }

    throw new YouTubeSearchError(
      "search_failed",
      "YouTube search failed. Check your query and try again."
    );
  }

  const entries = parseNdjson(rawOutput);
  const tracks = entries
    .map((entry) => entryToProviderTrack(entry))
    .filter((track): track is ProviderTrack => track !== null)
    .slice(0, limit);

  console.log(`YouTube search completed: results=${tracks.length}`);

  if (tracks.length === 0) {
    throw new YouTubeSearchError(
      "no_results",
      "No YouTube results found for that query. Try different search terms."
    );
  }

  return tracks;
}
