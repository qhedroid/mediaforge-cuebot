# YouTube Search Design

CueBot supports YouTube search through `/search`. Results are shown with Play buttons — no typing needed to queue a track.

## Legal-use boundary

YouTube search and playback is for content you have permission to use: your own recordings, public-domain works, Creative Commons-licensed content, or content the rights holder has made freely available. CueBot is not piracy tooling.

## Architecture

`packages/media-core` owns all YouTube interaction:

- `youtube-search.service.ts` — runs yt-dlp to search YouTube, returns `ProviderTrack[]`
- `ytdlp.service.ts` — owns download and audio extraction for both `/play url:` and button-triggered playback

CueBot owns:

- `/search` — accepts query, calls `searchYouTube`, caches results, renders formatted message with Play buttons
- `/ytsearch` — alias for `/search`, both commands work identically
- Button interactions (`cuebot:search-play:<userId>:<resultId>`) — ownership check, voice check, cache lookup, `prepareUrlInput`, enqueue/play
- `/play result:<n>` — fallback text-based result selection (dev/power-user path)
- Queue, voice session, and playback controls (unchanged)

CueBot never contains YouTube-specific media logic. The resolver path in `media-core` handles both direct YouTube URLs and search-result URLs.

## Commands

### `/search query:<text>`

Searches YouTube via yt-dlp and returns up to 5 results with Play buttons.

Example response:

```
YouTube results for: **lo-fi chill**

**1.** Lo-Fi Chill Mix
   SomeChannel · 32:14

**2.** Chill Study Beats
   AnotherChannel · 1:04:22

...

*Only use media you have permission to play.*

[Play 1] [Play 2] [Play 3] [Play 4] [Play 5]
```

Results are cached per guild/user for 10 minutes. Clicking a Play button queues the track.

### `/ytsearch query:<text>`

Alias for `/search`. Works identically. Docs and Discord UI advertise `/search` as the primary command.

### Button: Play 1 / Play 2 / ... / Play 5

Custom ID format: `cuebot:search-play:<userId>:<resultId>`

Flow:
1. CueBot checks the button belongs to the user who ran `/search` (ephemeral error if not)
2. CueBot acknowledges the button click (`deferUpdate`) — search results remain visible
3. CueBot checks the user is in a voice channel
4. CueBot reads the `ProviderTrack` from the search cache
5. `media-core.prepareUrlInput({ url: track.pageUrl })` → yt-dlp downloads and extracts audio
6. CueBot enqueues the prepared file and starts playback if idle
7. CueBot posts a visible follow-up: "Now playing: **Title**"

### `/play result:<n>` (fallback)

Text-based fallback. Works after `/search` or `/ytsearch`. Resolves the same `pageUrl` path as button clicks.

### `/play url:<YouTube URL>`

Unchanged. Directly resolves a YouTube URL through `prepareUrlInput`.

## yt-dlp search approach

`searchYouTube` calls yt-dlp with:

```
yt-dlp --dump-json --flat-playlist --no-warnings ytsearch<limit>:<query>
```

Output is NDJSON (one JSON object per result line). Audio is **not downloaded** during search — only after the user clicks a Play button.

Fields used per result:
- `id` → YouTube video ID
- `title` → track title
- `uploader` / `channel` → artist field
- `duration` → durationMs
- `webpage_url` → used as `pageUrl`; falls back to `https://www.youtube.com/watch?v=<id>`

Playlists are not supported. Results are always limited to the requested count.

## Error handling

| Trigger | Message |
|---|---|
| yt-dlp missing | yt-dlp could not be found. Install yt-dlp or set YTDLP_PATH in your root .env. |
| No results | No results found. Try a different search. |
| Search failed | CueBot could not search right now. Try again in a moment. |
| Button: wrong user | These search results belong to another user. Run /search to create your own. |
| Button: not in voice | Join a voice channel first, then choose a result. |
| Button: results expired | Those search results expired. Run /search again. |
| Playback error | Friendly UrlIngestError or VoiceSessionError message |

## Requirements

yt-dlp must be installed. Run `pnpm ytdlp:check` to verify availability.

FFmpeg and FFprobe are required for audio extraction and conversion.

Search results expire after 10 minutes.
