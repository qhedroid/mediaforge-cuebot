import type { MusicProvider, ProviderTrack, SearchQuery, SearchResult } from "@mediaforge/shared";

export class JamendoProvider implements MusicProvider {
  readonly id = "jamendo";
  readonly displayName = "Jamendo";

  async search(_query: SearchQuery): Promise<SearchResult> {
    return { providerId: this.id, tracks: [] };
  }

  async getTrack(_trackId: string): Promise<ProviderTrack | null> {
    return null;
  }
}
