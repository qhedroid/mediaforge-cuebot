# CueBot

![CueBot logo](assets/cuebot-logo.svg)

CueBot is a TypeScript Discord media bot built inside the MediaForge monorepo. It demonstrates Discord slash commands, button interactions, voice playback, queue controls, FFmpeg-backed media preparation, temporary-file cleanup, and a clean separation between Discord orchestration and reusable media logic.

MediaForge is the local media-preparation layer. `packages/media-core` owns ingestion, probing, conversion, resolver plumbing, and cleanup. CueBot owns Discord commands, user interaction, queues, and voice sessions.

Only use CueBot with media you own or have permission to play.

## Demo Flow

1. Start CueBot from the repository root.
2. In Discord, run `/ping` to confirm the bot is online.
3. Join a voice channel.
4. Run `/play attachment:<file>` with a small MP3, or run `/search query:<text>` and click a Play button.
5. Confirm CueBot joins voice and starts playback.
6. Try `/nowplaying`, `/queue`, `/pause`, `/resume`, `/skip`, and `/stop`.

Record a short demo with the checklist in [docs/demo-recording-checklist.md](docs/demo-recording-checklist.md). Place final captures in [docs/screenshots](docs/screenshots).

## Commands

| Command | Purpose | Status |
|---|---|---|
| `/ping` | Check CueBot is online | Implemented |
| `/play attachment:<file>` | Upload and play a Discord media attachment | Implemented |
| `/play url:<url>` | Prepare and play a permitted media URL | Implemented |
| `/search query:<text>` | Search and render playable results with buttons | Implemented |
| `/ytsearch query:<text>` | Alias for `/search` | Implemented |
| `/play result:<n>` | Text fallback for cached search results | Implemented |
| `/queue` | Show now playing and queued tracks | Implemented |
| `/nowplaying` | Show the current track | Implemented |
| `/pause` | Pause playback | Implemented |
| `/resume` | Resume playback | Implemented |
| `/skip` | Skip the current track | Implemented |
| `/stop` | Stop playback, clear queue, disconnect, and clean temp files | Implemented |

## Features

- Discord slash command registration and interaction handling
- Visible placeholder and error replies
- Attachment playback for MP3, WAV, M4A, OGG, WEBM, and MP4
- URL playback through `media-core`
- Button-based search result selection
- Per-guild queue state
- Pause, resume, skip, stop, queue, and now-playing controls
- FFmpeg/FFprobe validation and conversion
- Temporary files under `storage/cuebot-temp`
- Secret scanning for committed project files

## Known Limitations

- CueBot stores queue/search state in memory only.
- Restarting the bot clears queues and cached search results.
- There is no production database yet.
- There is no dashboard.
- Error handling is developer-friendly, but embeds and UX polish are still planned.
- Use is limited to media you own or have permission to play.

## Roadmap

| Milestone | Focus | Status |
|---|---|---|
| CueBot 0.1 | Uploaded Discord attachment playback and queue controls | Implemented |
| CueBot 0.2 | Direct URL playback through `media-core` | Implemented |
| CueBot 0.3 | Resolver-backed URL playback through `media-core` | Implemented |
| CueBot 0.4 | Search with button-based result selection | Implemented |
| CueBot 1.0 | Polished embeds, attribution display, persistence, and demo-ready UX | Planned |

See [docs/version-roadmap.md](docs/version-roadmap.md) for the detailed roadmap.

## Workspace

- `apps/cuebot`: Discord bot commands, interactions, voice sessions, queue state, and runtime.
- `apps/mediaforge-cli`: Local converter CLI shell.
- `packages/media-core`: Reusable media ingestion, probing, conversion, resolver, and cleanup logic.
- `packages/shared`: Shared TypeScript types.
- `docs`: Setup, architecture, roadmap, and demo documentation.
- `storage`: Local ignored temp/output/metadata folders.
- `scripts`: Local development and validation scripts.

## Development

Requirements:

- Node.js 22.12+
- pnpm 9+
- FFmpeg and FFprobe available on `PATH`, or configured through `.env`

Install dependencies:

```bash
pnpm install
```

Build all packages and apps:

```bash
pnpm build
```

Run the secret scanner:

```bash
pnpm secret:check
```

Copy `.env.example` to `.env` for local development. Do not commit `.env` or secrets.

## Discord Setup

Useful docs:

- [Local environment guide](docs/local-env.md)
- [Discord test server setup](docs/discord-test-server-setup.md)
- [CueBot 0.1 test checklist](docs/cuebot-0.1-test-checklist.md)
- [URL playback design](docs/url-playback-design.md)
- [Demo recording checklist](docs/demo-recording-checklist.md)
- [GitHub repo metadata](docs/github-repo-metadata.md)
