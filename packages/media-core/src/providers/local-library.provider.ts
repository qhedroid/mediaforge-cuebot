import type { MusicProvider, ProviderTrack, SearchQuery, SearchResult } from "@mediaforge/shared";

export class LocalLibraryProvider implements MusicProvider {
  readonly id = "local-library";
  readonly displayName = "Local Library";

  async search(_query: SearchQuery): Promise<SearchResult> {
    return { providerId: this.id, tracks: [] };
  }

  async getTrack(_trackId: string): Promise<ProviderTrack | null> {
    return null;
  }
}
