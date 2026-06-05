import type { ResolvedMedia, UrlResolver } from "./url-resolver.js";

export class ResolverRegistry {
  private readonly resolvers = new Map<string, UrlResolver>();

  register(resolver: UrlResolver): void {
    this.resolvers.set(resolver.id, resolver);
  }

  list(): UrlResolver[] {
    return [...this.resolvers.values()];
  }

  findResolver(url: URL): UrlResolver | null {
    return this.list().find((resolver) => resolver.canResolve(url)) ?? null;
  }

  async resolve(url: URL): Promise<ResolvedMedia | null> {
    return this.findResolver(url)?.resolve(url) ?? null;
  }
}
