# URL Playback Design

CueBot 0.2 introduces direct URL playback. CueBot 0.3 adds resolver URL playback via yt-dlp for legally permitted, user-provided media.

## Scope

`/play url:<url>` accepts two kinds of URLs:

**Direct media URLs** — HTTP/HTTPS URLs pointing to supported media file extensions (MP3, WAV, M4A, OGG, WEBM, MP4). Examples include user-owned files, public-domain files, Creative Commons files, or other directly accessible media links.

**Resolver URLs** — URLs handled by yt-dlp, such as YouTube video links. This covers any format yt-dlp supports, provided the content is legally permitted (owned, public domain, Creative Commons, or otherwise allowed).

YouTube search is not implemented. `/play url:<url>` requires a full URL; there is no `/play search:` or YouTube lookup feature in this build.

## Legal-use boundary

CueBot is not piracy tooling. Only use `/play url:` with media you own or have explicit permission to play. This includes your own recordings, public-domain works, Creative Commons-licensed content, and content the rights holder has made freely available.

## Architecture

CueBot owns:

- Discord slash commands
- visible user replies
- queueing
- voice connection and playback controls

`packages/media-core` owns:

- URL validation
- direct media download
- resolver URL selection and yt-dlp invocation
- FFprobe inspection
- FFmpeg preparation
- temporary file metadata and lifetime

CueBot does not contain any resolver or yt-dlp logic. All URL ingestion is handled inside `media-core`.

## Flow

### Direct media URL

```text
/play url:<direct media URL>
-> CueBot checks requester is in a voice channel
-> media-core detects a direct media extension
-> media-core downloads the file
-> media-core probes and converts if needed
-> CueBot queues the prepared temp file
-> CueBot joins voice and plays it
-> temp files are cleaned after playback or /stop
```

### Resolver URL (e.g. YouTube)

```text
/play url:<resolver URL>
-> CueBot checks requester is in a voice channel
-> media-core detects no direct media extension, enters resolver path
-> media-core runs yt-dlp --dump-json to fetch metadata and check duration
-> media-core rejects if duration > 15 minutes
-> media-core runs yt-dlp --extract-audio --audio-format mp3 to download
-> media-core locates the generated file
-> media-core ffprobes and converts if needed
-> CueBot queues the prepared temp file
-> CueBot joins voice and plays it
-> temp files are cleaned after playback or /stop
```

## Requirements

FFmpeg and FFprobe are required. Set them on `PATH` or configure `FFMPEG_PATH` and `FFPROBE_PATH` in local `.env`.

yt-dlp is required for resolver URL playback. Set it on `PATH` or configure `YTDLP_PATH` in local `.env`. Run `pnpm ytdlp:check` to verify availability.

Temporary files are stored under:

```text
storage/cuebot-temp
```

CueBot does not delete source files outside that temp directory.

## Limits

Direct media URLs must have a supported extension: MP3, WAV, M4A, OGG, WEBM, or MP4.

Resolver URLs are accepted for any yt-dlp-supported format.

Both paths enforce a 15 minute maximum duration. For resolver URLs, duration is checked via `--dump-json` metadata before download begins where possible.

Playlists are not supported. yt-dlp is always invoked with `--no-playlist`.

## yt-dlp configuration

yt-dlp executable path: `process.env.YTDLP_PATH ?? "yt-dlp"`.

Set `YTDLP_PATH` in your root `.env` if yt-dlp is not on `PATH`.

Only use media you own or have permission to play.
