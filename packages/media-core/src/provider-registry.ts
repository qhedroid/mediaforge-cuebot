import type { MusicProvider, ProviderTrack, SearchQuery, SearchResult } from "@mediaforge/shared";

export class ProviderRegistry {
  private readonly providers = new Map<string, MusicProvider>();

  register(provider: MusicProvider): void {
    this.providers.set(provider.id, provider);
  }

  list(): MusicProvider[] {
    return [...this.providers.values()];
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const selectedProviders = query.providerIds?.length
      ? query.providerIds.map((id) => this.providers.get(id)).filter((provider): provider is MusicProvider => Boolean(provider))
      : this.list();

    return Promise.all(selectedProviders.map((provider) => provider.search(query)));
  }

  async getTrack(providerId: string, trackId: string): Promise<ProviderTrack | null> {
    return this.providers.get(providerId)?.getTrack(trackId) ?? null;
  }
}
