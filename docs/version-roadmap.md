# Version Roadmap

## CueBot 0.1 - Implemented

Goal: uploaded Discord file playback with basic queue controls.

Target command:

```text
/play attachment:<file>
```

Status:

- Supports uploaded Discord attachments through `/play attachment:<file>`.
- MP3 plays directly; WAV, M4A, OGG, WEBM, and MP4 are prepared through FFmpeg.
- Includes `/queue`, `/nowplaying`, `/pause`, `/resume`, `/skip`, and `/stop`.

## CueBot 0.2 - Implemented

Goal: direct URL playback through `packages/media-core` for legally permitted media.

Target command:

```text
/play url:<supported_url>
```

Status:

- Supports direct HTTP/HTTPS media URLs.
- Supports resolver URLs through `media-core`.
- Temporary URL files are deleted after playback or `/stop`.

## CueBot 0.3 - Implemented

Goal: resolver-backed URL playback through `packages/media-core`.

Target command:

```text
/play url:<resolver_url>
```

Status:

- `media-core` owns resolver invocation and audio extraction.
- Duration capped at 15 minutes.
- Playlists are blocked.

## CueBot 0.4 - Implemented

Goal: YouTube search with button-based result selection.

Target commands:

```text
/search query:<text>
[click Play 1-5 button]
/play result:<n>  (fallback)
```

Status:

- `/search` is the only public search command.
- Search returns up to 5 results with Play buttons.
- Results are cached per guild/user for 10 minutes.
- Audio is downloaded/prepared only after the user clicks a Play button.
- Button ownership is enforced: only the user who ran `/search` can use their buttons.
- `/play result:<n>` remains as a text fallback.

## CueBot 1.0 - Planned

Goal: stable release with polished UX, embeds, attribution display, persistence, and demo-ready reliability.

Planned focus:

- Cleaner embeds and richer status messages.
- Better attribution display for licensed content.
- Durable queue/search state.
- Broader test coverage.
- More polished demo materials.
