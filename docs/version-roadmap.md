# Version Roadmap

## Implemented

### CueBot 0.1 - Uploaded File Playback

Status: implemented.

- `/play attachment:<file>` accepts Discord-uploaded media.
- MP3 plays directly.
- WAV, M4A, OGG, WEBM, and MP4 are prepared through FFmpeg.
- CueBot joins the requester's voice channel and starts playback.
- Queue controls are available through `/queue`, `/nowplaying`, `/pause`, `/resume`, `/skip`, and `/stop`.

### Direct URL and YouTube URL Playback

Status: implemented.

- `/play url:<url>` supports direct media URLs.
- Resolver-backed URLs are prepared through `packages/media-core`.
- FFmpeg/FFprobe validation remains inside media-core.
- Temporary files are cleaned after playback or stop flows.

### YouTube Search With Buttons

Status: implemented.

- `/search query:<text>` is the main user-facing search command.
- Search returns up to 5 results with Play buttons.
- Results are cached per guild/user for 10 minutes.
- Media is downloaded/prepared only after a user selects a result.
- Button clicks show immediate preparing feedback.
- `/play result:<n>` remains as a text fallback for cached search results.

## Future

### UX and Reliability

- Polished Discord embeds.
- Button controls for queue actions where useful.
- Clearer attribution and license display.
- Persistent queue/search state.
- Broader automated test coverage.

### Provider and Metadata Expansion

- Playlist support.
- Spotify metadata support.
- Better provider metadata normalization in `packages/media-core`.

### MediaForge Polish

- MediaForge desktop/CLI polish.
- Cleaner local conversion workflows.
- Better local library metadata editing.
- More explicit MediaForge-to-CueBot handoff documentation.
