# URL Playback Design

CueBot 0.2 introduces direct URL playback before provider search.

## Scope

`/play url:<url>` accepts direct HTTP/HTTPS media URLs for legally permitted media. Examples include user-owned files, public-domain files, Creative Commons files, or otherwise allowed direct media links.

Resolver URLs, including YouTube links, are planned for a future MediaForge URL provider. They are not implemented in the current build.

## Architecture

CueBot owns:

- Discord slash commands
- visible user replies
- queueing
- voice connection and playback controls

`packages/media-core` owns:

- URL validation
- URL download
- FFprobe inspection
- FFmpeg preparation
- temporary file metadata
- future resolver selection and resolver-specific preparation

## Flow

```text
/play url:<url>
-> CueBot checks requester is in a voice channel
-> media-core validates and downloads the direct media URL
-> media-core probes and converts if needed
-> CueBot queues the prepared temp file
-> CueBot joins voice and plays it
-> temp files are cleaned after playback or /stop
```

Future resolver flow:

```text
/play url:<resolver_url>
-> CueBot checks requester is in a voice channel
-> media-core selects a URL resolver
-> resolver prepares legally permitted media
-> CueBot queues and plays the prepared file
```

## Requirements

FFmpeg and FFprobe are required. Set them on `PATH` or configure `FFMPEG_PATH` and `FFPROBE_PATH` in local `.env`.

Temporary files are stored under:

```text
storage/cuebot-temp
```

CueBot should not delete source files outside that temp directory.

## Limits

The current MVP accepts direct media URLs with supported media extensions or content types:

- MP3
- WAV
- M4A
- OGG
- WEBM
- MP4

The MVP enforces a 15 minute maximum duration for URL playback.

URL extension validation applies only to direct media URLs. Resolver URLs are planned for a later MediaForge URL resolver and should not be handled inside CueBot.

Only use media you own or have permission to play.
