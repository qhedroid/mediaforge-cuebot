import type { MusicProvider, ProviderTrack, SearchQuery, SearchResult } from "@mediaforge/shared";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

interface LocalLibraryTrackFile {
  id?: unknown;
  title?: unknown;
  artist?: unknown;
  durationMs?: unknown;
  filePath?: unknown;
  license?: unknown;
  attributionText?: unknown;
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

function defaultMetadataPath(): string {
  return path.join(findRepoRoot(process.cwd()), "storage", "metadata", "local-library.json");
}

function toProviderTrack(track: LocalLibraryTrackFile): ProviderTrack | null {
  if (
    typeof track.id !== "string" ||
    typeof track.title !== "string" ||
    typeof track.filePath !== "string"
  ) {
    return null;
  }

  return {
    id: track.id,
    providerId: "local-library",
    title: track.title,
    artist: typeof track.artist === "string" ? track.artist : "Local Library",
    durationMs: typeof track.durationMs === "number" ? track.durationMs : undefined,
    filePath: path.resolve(findRepoRoot(process.cwd()), track.filePath),
    license: typeof track.license === "string" ? track.license : undefined,
    attributionText: typeof track.attributionText === "string" ? track.attributionText : undefined
  };
}

export class LocalLibraryProvider implements MusicProvider {
  readonly id = "local-library";
  readonly displayName = "Local Library";

  constructor(private readonly metadataPath = defaultMetadataPath()) {}

  async search(query: SearchQuery): Promise<SearchResult> {
    const tracks = await this.loadTracks();
    const normalizedQuery = query.text.trim().toLowerCase();
    const limit = query.limit ?? 5;

    if (!normalizedQuery) {
      return { providerId: this.id, tracks: tracks.slice(0, limit) };
    }

    return {
      providerId: this.id,
      tracks: tracks
        .filter((track) =>
          [track.title, track.artist]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(normalizedQuery))
        )
        .slice(0, limit)
    };
  }

  async getTrack(trackId: string): Promise<ProviderTrack | null> {
    const tracks = await this.loadTracks();
    return tracks.find((track) => track.id === trackId) ?? null;
  }

  private async loadTracks(): Promise<ProviderTrack[]> {
    if (!existsSync(this.metadataPath)) {
      console.log(`LocalLibraryProvider metadata file not found: ${this.metadataPath}`);
      return [];
    }

    try {
      const rawJson = await readFile(this.metadataPath, "utf8");
      const parsed = JSON.parse(rawJson) as unknown;

      if (!Array.isArray(parsed)) {
        console.error("LocalLibraryProvider metadata is malformed: expected an array.");
        return [];
      }

      return parsed
        .map((track) => toProviderTrack(track as LocalLibraryTrackFile))
        .filter((track): track is ProviderTrack => Boolean(track));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`LocalLibraryProvider could not read metadata: ${message}`);
      return [];
    }
  }
}
