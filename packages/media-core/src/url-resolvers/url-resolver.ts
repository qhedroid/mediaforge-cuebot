export interface ResolvedMedia {
  title?: string;
  durationMs?: number;
  sourceUrl: string;
  preparedFilePath?: string;
  metadata?: Record<string, unknown>;
}

export interface UrlResolver {
  readonly id: string;
  readonly displayName: string;
  canResolve(url: URL): boolean;
  resolve(url: URL): Promise<ResolvedMedia>;
}
