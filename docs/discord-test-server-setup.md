# Discord Test Server Setup

This is local development tooling for testing CueBot in a private Discord server.

## Generate the bot invite URL

Create a local `.env` file in the repository root from `.env.example` and set:

```text
DISCORD_TOKEN
DISCORD_CLIENT_ID
DISCORD_GUILD_ID
```

Do not commit `.env` or share the bot token.

Build the project:

```powershell
pnpm build
```

Run the setup check:

```powershell
pnpm --filter @mediaforge/cuebot setup:check
```

The setup check validates the required CueBot environment variables, prints a masked token preview, prints the client ID and guild ID, and generates a Discord invite URL with the scopes and permissions needed for CueBot 0.1 testing and future voice playback.

Copy the generated invite URL, open it in the browser, select or confirm the test server, and authorise the bot.

For CueBot 0.1 testing, the bot needs these server/channel permissions:

- View Channels
- Send Messages
- Use Application Commands
- Connect
- Speak

## Install FFmpeg

CueBot requires FFmpeg and FFprobe. Install FFmpeg and make sure both commands are available on `PATH`:

```powershell
ffmpeg -version
ffprobe -version
```

Or set `FFMPEG_PATH` and `FFPROBE_PATH` in your root `.env` if the executables are not on `PATH`.

CueBot also includes `opusscript` as a small fallback Opus encoder for `@discordjs/voice`. FFmpeg with libopus is still preferred when available.

## Install yt-dlp

Resolver URL playback (including YouTube) requires yt-dlp. Install it and make sure it is available on `PATH`:

```powershell
yt-dlp --version
```

Or set `YTDLP_PATH` in your root `.env` if yt-dlp is not on `PATH`:

```text
YTDLP_PATH=C:\path\to\yt-dlp.exe
```

Install docs: https://github.com/yt-dlp/yt-dlp#installation

Verify yt-dlp is available:

```powershell
pnpm ytdlp:check
```

## Register slash commands

```powershell
pnpm --filter @mediaforge/cuebot register
```

## Start CueBot

```powershell
pnpm --filter @mediaforge/cuebot start
```

## Test commands

```text
/ping
/play attachment:<small mp3>
/play url:<legally permitted direct media URL>
/play url:<legally permitted YouTube URL>
/search query:<search terms>
[click Play 1 button]
/play result:1
/queue
/nowplaying
/pause
/resume
/skip
/stop
```

Try `/ping` first. It should reply visibly with `Pong! CueBot is online.`

CueBot supports uploaded attachment playback through `/play attachment:<file>`. Join a voice channel before running the command. CueBot validates and stores supported media files in `storage/cuebot-temp`, probes/converts with FFmpeg when needed, joins the requester's voice channel, plays the queued track, and cleans up temporary files.

`/play url:<url>` supports two URL types:

**Direct media URLs** (MP3, WAV, M4A, OGG, WEBM, MP4): downloaded directly. Example: a public-domain MP3 from a file host.

**Resolver URLs** (YouTube and other yt-dlp-supported URLs): media-core runs yt-dlp to extract audio as MP3. Only use content you own or have legal permission to play.

The maximum duration for URL playback is 15 minutes.

`/search query:<text>` searches YouTube and returns up to 5 results with Play buttons. Click a button to queue the track. Results are cached per guild/user for 10 minutes. Join a voice channel before clicking. `/ytsearch` is an alias that works identically. `/play result:<n>` is a text-based fallback if you prefer typing.

## Troubleshooting

If commands appear in Discord but no reply is visible, check the PowerShell logs from:

```powershell
pnpm --filter @mediaforge/cuebot start
```

Confirm the bot has View Channels and Send Messages permission in the test channel.

Confirm the bot is online by keeping the start command running.

Try `/ping` before testing the other placeholder commands.

To test a local media file without Discord upload/download, run:

```powershell
pnpm media:test "C:\path\to\file.mp3"
```

To verify a direct URL before using it in Discord:

```powershell
pnpm url:test "<url>"
```

To verify yt-dlp is installed and reachable:

```powershell
pnpm ytdlp:check
```

If `/play url:<YouTube URL>` fails with "yt-dlp could not be found", install yt-dlp and run `pnpm ytdlp:check` to confirm it is available.

External provider search and MediaForge CLI features are not implemented.
