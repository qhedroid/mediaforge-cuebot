# MediaForge + CueBot

MediaForge + CueBot is a portfolio-safe local-first media preparation and Discord playback project.

CueBot is a Discord music bot. CueBot 0.1 supports uploaded, user-provided media playback. CueBot 0.2 adds search across open or licensed music providers. CueBot 1.0 adds MediaForge URL playback for legally permitted media.

MediaForge is a separate personal local media converter. It owns local media preparation workflows and reusable conversion logic through `packages/media-core`.

This project is not described or designed as a YouTube downloader, piracy tool, or rights bypass system. URL playback is reserved for legally permitted media sources and future MediaForge-supported ingestion.

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
- CueBot 0.2: planned `/search query:<text>` and `/play result:<result_id>`.
- CueBot 1.0: planned `/play url:<supported_url>` and `/play query:<search_terms>`.

## CueBot 0.1 Status

CueBot 0.1 can play uploaded Discord attachments from `/play attachment:<file>`.

- MP3 files are used directly for playback.
- WAV, M4A, OGG, WEBM, and MP4 files are prepared through FFmpeg.
- Queue controls are available through `/queue`, `/nowplaying`, `/pause`, `/resume`, `/skip`, and `/stop`.
- FFmpeg and FFprobe are required for validation and preparation.
- CueBot stores temporary playback files in `storage/cuebot-temp` and cleans them up after playback or `/stop`.

CueBot 0.2 will add open/licensed provider search. CueBot 1.0 will add MediaForge URL playback for legally permitted media.

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

## Current Scope

CueBot 0.1 implements uploaded attachment playback only. Provider APIs, YouTube support, MediaForge URL playback, and MediaForge CLI conversion features are not implemented.
