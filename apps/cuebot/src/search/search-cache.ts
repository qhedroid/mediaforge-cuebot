import type { ProviderTrack } from "@mediaforge/shared";

export interface CachedSearchResult {
  resultId: string;
  track: ProviderTrack;
}

interface CacheEntry {
  expiresAt: number;
  results: CachedSearchResult[];
}

const defaultTtlMs = 10 * 60 * 1000;

export class SearchCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(private readonly ttlMs = defaultTtlMs) {}

  store(guildId: string, userId: string, tracks: ProviderTrack[]): CachedSearchResult[] {
    const results = tracks.map((track, index) => ({
      resultId: String(index + 1),
      track
    }));

    this.entries.set(this.key(guildId, userId), {
      expiresAt: Date.now() + this.ttlMs,
      results
    });

    return results;
  }

  get(guildId: string, userId: string, resultId: string): ProviderTrack | null {
    const key = this.key(guildId, userId);
    const entry = this.entries.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    return entry.results.find((result) => result.resultId === resultId)?.track ?? null;
  }

  private key(guildId: string, userId: string): string {
    return `${guildId}:${userId}`;
  }
}

export const searchCache = new SearchCache();
