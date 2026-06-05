# Version Roadmap

## CueBot 0.1 - Implemented

Goal: uploaded Discord file playback with basic queue controls.

Target command:

```text
/play attachment:<file>
```

Responsibilities:

- CueBot accepts a Discord attachment from a user.
- CueBot passes attachment preparation to `packages/media-core`.
- `media-core` handles attachment ingest, probing, conversion, metadata, and cleanup.
- CueBot owns Discord interactions, voice sessions, queue state, playback controls, and embeds.

Status:

- Implemented in commit `ed470ba`.
- Supports uploaded Discord attachments through `/play attachment:<file>`.
- MP3 plays directly; WAV, M4A, OGG, WEBM, and MP4 are prepared through FFmpeg.
- Includes `/queue`, `/nowplaying`, `/pause`, `/resume`, `/skip`, and `/stop`.

## CueBot 0.2 - In Progress

Goal: direct URL playback through `packages/media-core` for legally permitted media.

Target commands:

```text
/play url:<supported_direct_media_url>
```

Responsibilities:

- CueBot accepts a user-provided direct media URL.
- `media-core` owns URL validation, download, probing, conversion, and metadata.
- CueBot queues and plays the prepared file.
- Temporary URL files are deleted after playback or `/stop`.

Status:

- In progress with direct HTTP/HTTPS media URL ingestion.
- `LocalLibraryProvider` is dev-only/experimental and no longer a core roadmap feature.

## CueBot 0.3 - Planned

Goal: MediaForge URL resolver foundation for legally permitted media.

Target commands:

```text
/play attachment:<file>
/play url:<supported_url>
```

Responsibilities:

- CueBot remains focused on Discord commands, voice sessions, queues, and embeds.
- MediaForge and `media-core` own resolver selection, URL ingest, and media preparation.
- Resolver URLs are handled through media-core provider interfaces, not CueBot command logic.
- URL playback remains limited to legally permitted media sources.
- The project avoids rights bypassing and does not position itself as a downloader for restricted platforms.

## CueBot 1.0 - Planned

Goal: YouTube URL/search support through a resolver provider, plus selectable playback for legally permitted media.

Target commands:

```text
/search query:<text>
/play result:<result_id>
```

Responsibilities:

- Provider integrations live in `packages/media-core`.
- Provider results expose license and attribution metadata where available.
- CueBot queues selected result IDs without provider-specific media logic directly.
