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

CueBot 0.1 playback requires FFmpeg and FFprobe. Install FFmpeg and make sure both commands are available on `PATH`:

```powershell
ffmpeg -version
ffprobe -version
```

CueBot also includes `opusscript` as a small fallback Opus encoder for `@discordjs/voice`. FFmpeg with libopus is still preferred when available.

Then register slash commands to the development server:

```powershell
pnpm --filter @mediaforge/cuebot register
```

Start CueBot:

```powershell
pnpm --filter @mediaforge/cuebot start
```

Test commands:

```text
/ping
/play attachment:<small mp3>
/play url:<legally permitted direct media URL>
/queue
/nowplaying
/pause
/resume
/skip
/stop
```

Try `/ping` first. It should reply visibly with `Pong! CueBot is online.`

CueBot 0.1 supports uploaded attachment playback through `/play attachment:<file>`. Join a voice channel before running the command. CueBot validates and stores supported media files in `storage/cuebot-temp`, probes/converts with FFmpeg when needed, joins the requester's voice channel, plays the queued track, and cleans up temporary files.

CueBot 0.2 adds `/play url:<url>` for legally permitted direct media URLs. The user must join a voice channel first. Temporary URL files are stored in `storage/cuebot-temp` and cleaned after playback or `/stop`.

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

Provider search, MediaForge URL playback, MediaForge CLI features, and YouTube support are not implemented.
