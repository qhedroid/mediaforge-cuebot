# YouTube Search Design

CueBot supports YouTube search through `/search`. Results are shown with Play buttons, so `/search` is the only public search command.

## Legal-use boundary

YouTube search and playback is for content you have permission to use: your own recordings, public-domain works, Creative Commons-licensed content, or content the rights holder has made freely available. CueBot is not piracy tooling.

## Architecture

`packages/media-core` owns YouTube interaction:

- `youtube-search.service.ts` runs yt-dlp search and returns `ProviderTrack[]`.
- `ytdlp.service.ts` owns download and audio extraction for `/play url:` and button-triggered playback.

CueBot owns:

- `/search`, which accepts a query, calls `searchYouTube`, caches results, and renders a formatted message with Play buttons.
- Button interactions (`cuebot:search-play:<userId>:<resultId>`), which enforce ownership, check voice state, read the cache, call `prepareUrlInput`, then enqueue/play.
- `/play result:<n>`, a fallback text-based result selection path.
- Queue, voice session, and playback controls.

CueBot does not contain YouTube-specific media preparation logic. The resolver path in `media-core` handles URL preparation.

## `/search query:<text>`

Search returns up to 5 results.

Example response:

```text
Search results for: panic at the disco

1. Panic! At The Disco - High Hopes
Channel: Panic! At The Disco
Duration: 3:17

2. Panic! At The Disco - I Write Sins Not Tragedies
Channel: Fueled By Ramen
Duration: 3:06

Use the buttons below to queue a result.
Only use media you have permission to play.

[Play 1] [Play 2] [Play 3] [Play 4] [Play 5]
```

Results are cached per guild/user for 10 minutes. Search only fetches result metadata. Media is downloaded/prepared only after the user selects a result.

## Button Flow

1. CueBot acknowledges the button click immediately.
2. CueBot sends visible feedback: `Preparing: <title>...`.
3. CueBot checks the user is in a voice channel.
4. CueBot reads the selected result from the cache.
5. `media-core.prepareUrlInput({ url: track.pageUrl })` prepares the local audio file.
6. CueBot enqueues the prepared file and starts playback if idle.
7. CueBot updates the visible reply to `Now playing: <title>` or `Queued: <title> at position <n>`.

After a result is selected, CueBot removes the buttons from the original search message and marks the selected title.

## Error Handling

| Trigger | Message |
|---|---|
| yt-dlp missing | yt-dlp could not be found. Install yt-dlp or set YTDLP_PATH in your root .env. |
| No results | No results found. Try a different search. |
| Search failed | CueBot could not search right now. Try again in a moment. |
| Button: wrong user | These search results belong to another user. Run /search to create your own. |
| Button: not in voice | Join a voice channel first, then choose a result. |
| Button: results expired | Those search results expired. Run /search again. |
| Playback error | Friendly UrlIngestError or VoiceSessionError message. |

## Requirements

yt-dlp must be installed. Run:

```powershell
pnpm ytdlp:check
```

FFmpeg and FFprobe are required for audio extraction and conversion.
