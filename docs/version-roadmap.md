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

## CueBot 0.2 - Implemented

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

- Implemented. Supports direct HTTP/HTTPS media URLs and resolver URLs (YouTube, yt-dlp-supported).
- `LocalLibraryProvider` is dev-only/experimental and no longer a core roadmap feature.

## CueBot 0.3 - Implemented

Goal: yt-dlp resolver for YouTube URL playback through `packages/media-core`.

Target commands:

```text
/play url:<YouTube URL>
```

Status:

- Implemented. `media-core` owns yt-dlp invocation and audio extraction.
- Duration capped at 15 minutes. Playlists blocked.
- Temp files deleted after playback or `/stop`.

## CueBot 0.4 - Implemented

Goal: YouTube search with button-based result selection.

Target commands:

```text
/search query:<text>
[click Play 1–5 button]
/play result:<n>  (fallback)
```

Responsibilities:

- `media-core` owns YouTube search via yt-dlp (`searchYouTube`).
- CueBot `/search` calls `searchYouTube`, caches results, replies with formatted message and Play buttons.
- CueBot button handler (`cuebot:search-play:<userId>:<resultId>`) owns ownership check, voice check, cache lookup, `prepareUrlInput`, and enqueue/play.
- `/ytsearch` is an alias that works identically to `/search`.
- `/play result:<n>` remains as a text-based fallback.

Status:

- Implemented. YouTube search returns up to 5 results with Play buttons. Results cached per guild/user for 10 minutes.
- Audio is only downloaded after the user clicks a Play button — search itself is fast.
- Button ownership enforced: only the user who ran `/search` can use their buttons.

## CueBot 1.0 - Planned

Goal: stable release with polished UX, embeds, and attribution display.

Target commands:

```text
/ytsearch query:<text>
/play result:<n>
/play url:<url>
/play attachment:<file>
```

Responsibilities:

- Embed-based search results with thumbnails where available.
- Proper attribution display for licensed content.
- Provider results expose license and attribution metadata.
- CueBot queues selected result IDs without provider-specific media logic.
