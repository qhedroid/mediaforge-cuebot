# MediaForge + CueBot

MediaForge + CueBot is a portfolio-safe local-first media preparation and Discord playback project.

CueBot is a Discord music bot. CueBot 0.1 supports uploaded, user-provided media playback. CueBot 0.2 adds direct URL playback for legally permitted media. Future provider search remains focused on open/licensed sources.

MediaForge is a separate personal local media converter. It owns local media preparation workflows and reusable conversion logic through `packages/media-core`.

This project is not described or designed as a YouTube downloader, piracy tool, or rights bypass system. URL playback is reserved for direct, legally permitted media sources.

## Workspace

- `apps/cuebot`: Discord bot shell, slash command placeholders, voice/session/queue ownership in future releases.
- `apps/mediaforge-cli`: Personal local converter CLI shell.
- `packages/media-core`: Reusable media preparation services, provider registry, ingest placeholders, conversion boundaries.
- `packages/shared`: Shared TypeScript types used by apps and packages.
- `docs`: Roadmap, architecture, legal usage, and Windows setup notes.
- `storage`: Local ignored working folders for temporary files, converted output, and JSON metadata.
- `scripts`: Future automation scripts.

## Version Targets

- CueBot 0.1: implemented uploaded attachment playback with queue controls.
- CueBot 0.2: in progress direct permitted URL playback through `/play url:<url>`.
- CueBot 1.0: planned open/licensed provider search and selectable playback.

## CueBot 0.1 Status

CueBot 0.1 can play uploaded Discord attachments from `/play attachment:<file>`.

- MP3 files are used directly for playback.
- WAV, M4A, OGG, WEBM, and MP4 files are prepared through FFmpeg.
- Queue controls are available through `/queue`, `/nowplaying`, `/pause`, `/resume`, `/skip`, and `/stop`.
- FFmpeg and FFprobe are required for validation and preparation.
- CueBot stores temporary playback files in `storage/cuebot-temp` and cleans them up after playback or `/stop`.

CueBot 0.2 adds direct URL playback for legally permitted media through `media-core`. Provider search is not the main 0.2 focus; the local library provider is dev-only/experimental.

## CueBot 0.2 Direction

CueBot 0.2 keeps URL ingestion and preparation in `packages/media-core`. CueBot only handles Discord command input, queueing, voice playback, and user-facing responses.

- `/play url:<url>` supports direct HTTP/HTTPS media files for legally permitted media.
- FFmpeg and FFprobe are still required.
- Temporary files are stored under `storage/cuebot-temp` and cleaned after playback or `/stop`.
- YouTube extraction and `yt-dlp` are not implemented.

## Development

Requirements:

- Node.js 22+
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

Copy `.env.example` to `.env` for local development. Do not commit `.env` or secrets.

Local Discord setup:

- [Local environment guide](docs/local-env.md)
- [Discord test server setup](docs/discord-test-server-setup.md)
- [CueBot 0.1 test checklist](docs/cuebot-0.1-test-checklist.md)
- [URL playback design](docs/url-playback-design.md)

## Current Scope

CueBot implements uploaded attachment playback and direct permitted URL playback foundation. External provider APIs, YouTube support, and MediaForge CLI conversion features are not implemented.
