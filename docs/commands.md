# CueBot Commands

Run this after command changes:

```powershell
pnpm --filter @mediaforge/cuebot register
```

## User-Facing Commands

| Command | Description |
|---|---|
| `/help` | Show CueBot commands and basic usage notes. |
| `/ping` | Check whether CueBot is online and responding. |
| `/search query:<song>` | Search YouTube and show up to 5 results with Play buttons. |
| `/play attachment:<file>` | Play an uploaded Discord audio/video attachment. |
| `/play url:<url>` | Play a direct media URL or supported resolver URL. |
| `/play result:<n>` | Fallback text command for a cached `/search` result. |
| `/queue` | Show the current queue. |
| `/nowplaying` | Show the current track. |
| `/pause` | Pause playback. |
| `/resume` | Resume playback. |
| `/skip` | Skip the current track. |
| `/stop` | Stop playback, clear the queue, disconnect, and clean temp files. |

## Search Flow

`/search` is the main and only public search command. It searches YouTube, caches results per guild/user for 10 minutes, and displays Play buttons. CueBot downloads/prepares media only after a user selects a result.

Only the user who ran `/search` can use that message's Play buttons. Join a voice channel before using `/play` or selecting a result.

Only use media you have permission to play.

## Notes

After re-registering commands, only `/search query:<song>` should appear as the search command in Discord.
