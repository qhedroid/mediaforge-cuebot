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

## CueBot 0.2 - Planned

Goal: open or licensed music provider search.

Target commands:

```text
/search query:<text>
/play result:<result_id>
```

Responsibilities:

- CueBot accepts search terms and displays provider-backed results.
- Provider integration lives in `packages/media-core`.
- Provider results must expose license and attribution metadata when available.
- CueBot queues selected result IDs without implementing provider-specific logic directly.

## CueBot 1.0 - Planned

Goal: uploaded playback, open/licensed provider search, and MediaForge URL playback for legally permitted media.

Target commands:

```text
/play attachment:<file>
/search query:<text>
/play result:<result_id>
/play url:<supported_url>
/play query:<search_terms>
```

Responsibilities:

- CueBot remains focused on Discord commands, voice sessions, queues, and embeds.
- MediaForge and `media-core` own URL ingest and media preparation.
- URL playback is only for supported, legally permitted media sources.
- The project avoids rights bypassing and does not position itself as a downloader for restricted platforms.
