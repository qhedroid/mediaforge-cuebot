export type CueBotVersion = "0.1" | "0.2" | "1.0";

export type MediaSourceType =
  | "discord_attachment"
  | "provider_track"
  | "mediaforge_url"
  | "local_file";

export type PlaybackStatus =
  | "queued"
  | "preparing"
  | "ready"
  | "playing"
  | "paused"
  | "skipped"
  | "stopped"
  | "failed";

export interface TrackMetadata {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  durationMs?: number;
  sourceType: MediaSourceType;
  sourceUri?: string;
  preparedFilePath?: string;
  originalFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  license?: string;
  attributionUrl?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface QueueItem {
  id: string;
  guildId: string;
  requestedByUserId: string;
  metadata: TrackMetadata;
  status: PlaybackStatus;
  preparedFilePath?: string;
  failedReason?: string;
  enqueuedAt: string;
}

export interface PrepareOptions {
  guildId?: string;
  requestedByUserId?: string;
  targetFormat?: "opus" | "mp3" | "wav";
  normalizeAudio?: boolean;
  outputDirectory?: string;
}

export interface AttachmentInput {
  filename: string;
  contentType?: string;
  sizeBytes?: number;
  url: string;
}

export interface UrlInput {
  url: string;
  sourceType?: MediaSourceType;
}

export interface SearchQuery {
  text: string;
  providerIds?: string[];
  limit?: number;
}

export interface SearchResult {
  providerId: string;
  tracks: ProviderTrack[];
}

export interface ProviderTrack {
  id: string;
  providerId: string;
  title: string;
  artist?: string;
  durationMs?: number;
  streamUrl?: string;
  pageUrl?: string;
  license?: string;
  attributionText?: string;
}

export interface MusicProvider {
  id: string;
  displayName: string;
  search(query: SearchQuery): Promise<SearchResult>;
  getTrack(trackId: string): Promise<ProviderTrack | null>;
}
