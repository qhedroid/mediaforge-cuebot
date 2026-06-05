# MediaForge + CueBot

MediaForge + CueBot is a portfolio-safe local-first media preparation and Discord playback project.

CueBot is a Discord music bot. Its first release supports uploaded, user-provided media. CueBot 0.2 adds search across open or licensed music providers. CueBot 1.0 adds MediaForge URL playback for legally permitted media.

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

- CueBot 0.1: `/play attachment:<file>`
- CueBot 0.2: `/search query:<text>` and `/play result:<result_id>`
- CueBot 1.0: `/play url:<supported_url>` and `/play query:<search_terms>`

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

## Current Scope

This scaffold intentionally does not implement Discord playback, provider APIs, YouTube support, URL downloading, or production conversion logic. It only establishes the monorepo structure, TypeScript build wiring, placeholder command modules, placeholder media services, shared types, and documentation.
