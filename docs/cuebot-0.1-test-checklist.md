# CueBot 0.1 Test Checklist

Use this checklist for local release-prep testing in a private Discord server.

## Local Checks

Install dependencies:

```powershell
pnpm install
```

Build the workspace:

```powershell
pnpm build
```

Run the secret scanner:

```powershell
pnpm secret:check
```

Do not commit `.env`, logs, generated media files, or Discord tokens.

## Environment Setup

Create `.env` in the repository root from `.env.example`.

Required CueBot values:

```text
DISCORD_TOKEN
DISCORD_CLIENT_ID
DISCORD_GUILD_ID
```

FFmpeg and FFprobe must be available on `PATH`, or set these values in `.env`:

```text
FFMPEG_PATH
FFPROBE_PATH
```

Check local media before Discord upload testing:

```powershell
pnpm media:test "C:\path\to\file.mp3"
```

## Discord Setup

Validate local env and generate the invite URL:

```powershell
pnpm --filter @mediaforge/cuebot setup:check
```

Copy the generated invite URL, open it in a browser, select the test server, and authorise the bot.

Register slash commands:

```powershell
pnpm --filter @mediaforge/cuebot register
```

Start CueBot:

```powershell
pnpm --filter @mediaforge/cuebot start
```

## Discord Test Sequence

Join a voice channel before testing playback.

Run:

```text
/ping
/play attachment:<small mp3>
/nowplaying
/queue
/pause
/resume
/skip
/stop
```

Expected results:

- `/ping` replies `Pong! CueBot is online.`
- `/play attachment:<small mp3>` downloads, validates, queues, joins voice, and plays audio.
- `/nowplaying` shows the current track title and track ID.
- `/queue` shows the current track and queued tracks, or reports an empty queue.
- `/pause` pauses playback.
- `/resume` resumes playback.
- `/skip` skips the current track.
- `/stop` stops playback, clears the queue, disconnects, and cleans temporary files.

## Common Errors And Fixes

`Please join a voice channel before using /play.`

Join a voice channel in the test server, then run `/play attachment:<file>` again.

`FFprobe could not inspect this file.`

Confirm FFmpeg and FFprobe are installed and available:

```powershell
ffmpeg -version
ffprobe -version
```

If they are not on `PATH`, set `FFMPEG_PATH` and `FFPROBE_PATH` in root `.env`.

`FFmpeg is missing or failed.`

Confirm `FFMPEG_PATH` points to `ffmpeg.exe`, not only the containing folder.

`Unsupported file type.`

CueBot 0.1 accepts MP3, WAV, M4A, OGG, WEBM, and MP4.

`File is too large.`

CueBot 0.1 has a 25 MB attachment intake limit.

No visible Discord reply:

Check the PowerShell logs where CueBot is running. Confirm the bot has View Channels, Send Messages, Use Application Commands, Connect, and Speak permissions.

No audible playback:

Confirm the bot joined the same voice channel as the requester. Check logs for audio player status changes and FFmpeg dependency output.
