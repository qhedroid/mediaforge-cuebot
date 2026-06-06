# CueBot Demo Script

This is a two-minute demo flow for a portfolio video.

## Before Recording

Open:

- PowerShell in the repository root.
- Discord test server.
- A voice channel you can join.
- A small local MP3 for attachment testing.

Run:

```powershell
pnpm build
pnpm secret:check
pnpm ytdlp:check
pnpm --filter @mediaforge/cuebot register
pnpm --filter @mediaforge/cuebot start
```

## Two-Minute Flow

1. Show the terminal with CueBot running.
2. Join a Discord voice channel.
3. Run `/help`.
4. Run `/play attachment:<file>` with a small MP3.
5. Show CueBot joining voice and playing.
6. Run `/search query:<song>`.
7. Show the formatted results and Play buttons.
8. Click `Play 1`.
9. Show the immediate `Preparing: <title>...` response.
10. Show `Now playing` or `Queued`.
11. Run `/queue`.
12. Run `/pause`.
13. Run `/resume`.
14. Run `/skip`.
15. Run `/stop`.

## Talking Points

- CueBot handles Discord commands, buttons, queue state, and voice playback.
- MediaForge media-core handles media preparation, probing, conversion, and resolver work.
- Search only downloads media after the user selects a result.
- The project is local-first and intended for legally permitted media playback.

## Expected Results

- `/help` replies visibly.
- `/play attachment` queues and plays the uploaded file.
- `/search` returns up to 5 readable results.
- Play buttons respond immediately.
- Queue controls work without restarting the bot.
- `/stop` disconnects and clears playback state.
