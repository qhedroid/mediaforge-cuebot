# MediaForge Architecture

MediaForge is a local-first batch media processing pipeline. It keeps orchestration in the CLI, reusable media services in `packages/media-core`, and shared contracts in `packages/shared`.

## Local-First Design

The pipeline resolves local paths, validates local inputs, and writes planned outputs under repository-controlled storage directories. It does not require hosted services, secrets, or remote job queues. Dry-run mode is the primary demo path because it verifies the workflow without requiring large media fixtures or real transcoding.

## Pipeline Flow

```text
JSON config
  -> config validation
  -> local input resolution
  -> stage normalization
  -> output path generation
  -> command planning
  -> dry-run report or injected runner execution
```

## Stages

MediaForge supports three ordered stages:

| Stage | Responsibility |
|---|---|
| `probe` | Build an FFprobe inspection command for the source asset. |
| `transcode` | Build an FFmpeg command for the target output asset. |
| `metadata` | Prepare metadata output for downstream use and handover. |

Configs may list stages in any order. The pipeline normalizes them into `probe`, `transcode`, then `metadata` so repeated runs are predictable.

## Config Model

The config is a JSON object with:

- `inputDir`: optional base directory for source assets.
- `outputDir`: required output directory for generated assets.
- `targetFormat`: optional `mp3`, `wav`, or `opus`; defaults to `mp3`.
- `assets`: required non-empty list of local input assets.

Each asset may define:

- `input`: required local path relative to `inputDir`.
- `outputName`: optional filename stem for the generated output.
- `stages`: optional subset of supported stages.

## FFmpeg Usage

MediaForge currently plans FFprobe and FFmpeg commands rather than bundling either tool. FFprobe is used for source inspection. FFmpeg is used for audio-focused output generation with video removed via `-vn`. Real execution should run only in environments where FFmpeg and FFprobe are installed and the source media is legally permitted for local processing.

## Error Handling

Config errors use `MediaForgeConfigError` with clear messages for invalid JSON shape, unsupported formats, unsupported stages, or missing required fields.

Pipeline errors use `MediaForgePipelineError`. Missing inputs fail before command execution. Stage execution failures include the failed stage name so operators can identify whether the issue was probing, transcoding, or metadata generation.

## Relationship To CueBot

CueBot is the Discord application layer. It owns commands, interactions, queues, and voice sessions. `packages/media-core` owns reusable media services. MediaForge is the local CLI pipeline surface that demonstrates batch workflow design around the same media preparation boundary.

## Limitations

- Full non-dry-run execution is intentionally thin and expects an injected command runner.
- The metadata stage is currently planned rather than persisted as a complete artifact.
- There is no verified Docker workflow.
- The project is scoped to local, legally permitted media workflows.

## Future Improvements

- Add a production-quality local command runner.
- Persist metadata JSON files with duration, source, output, and run details.
- Add tiny generated media fixtures for end-to-end FFmpeg validation.
- Expand CLI help and config examples.
- Add Docker only if it is implemented, tested, and useful for local handoff.
