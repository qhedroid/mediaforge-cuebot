# Architecture

## Boundaries

CueBot is the Discord application layer. It should contain command registration, command handlers, voice session orchestration, queue management, playback state, and Discord embeds.

CueBot must not contain FFmpeg execution, FFprobe inspection, URL ingestion, provider search, or conversion logic directly. Those capabilities belong in `packages/media-core`.

MediaForge is a personal local converter. The CLI app should call `packages/media-core` for conversion, metadata, and cleanup workflows.

## Packages

`packages/shared` contains shared TypeScript contracts:

- `TrackMetadata`
- `QueueItem`
- `PrepareOptions`
- `AttachmentInput`
- `UrlInput`
- `PlaybackStatus`
- `MediaSourceType`
- `MusicProvider`
- `SearchQuery`
- `SearchResult`
- `ProviderTrack`
- `CueBotVersion`

`packages/media-core` contains reusable media preparation modules:

- `ffmpeg.service.ts`
- `ffprobe.service.ts`
- `attachment-ingest.service.ts`
- `url-ingest.service.ts`
- `conversion.service.ts`
- `metadata.service.ts`
- `cleanup.service.ts`
- `provider-registry.ts`
- `providers/local-library.provider.ts`
- `providers/jamendo.provider.ts`
- `providers/internet-archive.provider.ts`

## Data Flow

CueBot 0.1 attachment playback:

```text
Discord command -> CueBot command handler -> media-core attachment ingest -> metadata/conversion -> CueBot queue -> voice playback
```

CueBot 0.2 provider search:

```text
Discord command -> CueBot command handler -> media-core provider registry -> provider result metadata -> CueBot embed/results -> queue by result ID
```

CueBot 1.0 MediaForge URL playback:

```text
Discord command -> CueBot command handler -> media-core URL ingest -> legal source validation -> metadata/conversion -> CueBot queue -> voice playback
```

## Storage

MVP storage is local JSON and local files:

- `storage/cuebot-temp`: ignored temporary CueBot media workspace.
- `storage/mediaforge-output`: ignored local converter output.
- `storage/metadata`: ignored JSON metadata records.

Each storage directory keeps a committed `.gitkeep`, while generated contents are ignored.
