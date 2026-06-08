# Production Environment

Production environment values belong on the machine running CueBot. For the M4 Mac mini home server, keep them in the repository-local `.env` file on that Mac only.

Do not commit `.env`. Do not paste secrets into docs, GitHub issues, Discord, or logs.

## Required

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID`

## Optional

- `FFMPEG_PATH`
- `FFPROBE_PATH`
- `YTDLP_PATH`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `MEDIA_RESOLVER_MODE=home`

## Notes

- `.env` is local only.
- Server-only values belong on the Mac mini or the server running CueBot.
- `MEDIA_RESOLVER_MODE=home` is a documentation flag for deployment clarity. CueBot does not require it for playback.
- On Apple Silicon Macs, Homebrew tools usually live under `/opt/homebrew/bin`.
- Verify paths with:

```zsh
which ffmpeg
which ffprobe
which yt-dlp
which pnpm
```
