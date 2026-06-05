import type { MusicProvider, ProviderTrack, SearchQuery, SearchResult } from "@mediaforge/shared";

export class InternetArchiveProvider implements MusicProvider {
  readonly id = "internet-archive";
  readonly displayName = "Internet Archive";

  async search(_query: SearchQuery): Promise<SearchResult> {
    return { providerId: this.id, tracks: [] };
  }

  async getTrack(_trackId: string): Promise<ProviderTrack | null> {
    return null;
  }
}
