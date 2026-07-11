# LinkedIn Post — MediaForge Launch

Attach: `assets/mediaforge-dryrun-demo.png` (or the GIF converted to video).
Link: https://github.com/qhedroid/mediaforge-cuebot

---

## Variant A (full)

Second portfolio project shipped: MediaForge.

MediaForge is a local-first batch media processing pipeline for repeatable media asset workflows. You describe the work in a JSON config, and it validates inputs, orders the stages (probe, transcode, metadata), builds the FFprobe/FFmpeg commands, and shows you the full plan in dry-run mode before anything touches your files.

The interesting part wasn't the media processing. It was making a small tool behave like something you could hand to another engineer:

• Deterministic stage ordering, so repeated runs produce the same plan
• Dry-run planning, so you verify before you process
• A test suite covering config parsing, planning, dry-run behaviour and failure handling, on Node's built-in test runner
• GitHub Actions CI on every push and PR
• Architecture docs written for handover, not decoration

One deliberate omission: no Docker. It's a local-first CLI, and containerising it would have been checklist-chasing rather than engineering. Knowing what to leave out is part of the design.

Built with TypeScript, Node 22 and pnpm workspaces. The same media-core package also powers CueBot, a companion Discord playback bot in the monorepo.

Repo: https://github.com/qhedroid/mediaforge-cuebot

#TypeScript #NodeJS #FFmpeg #DevOps #PlatformEngineering #SoftwareEngineering #Portfolio

---

## Variant B (short)

Shipped another portfolio project: MediaForge, a local-first batch media processing pipeline in TypeScript.

JSON config in, validated execution plan out. Deterministic stage ordering (probe, transcode, metadata), dry-run mode so you see every FFmpeg command before it runs, meaningful tests, and CI on every push.

Deliberately no Docker. It's a local-first CLI; a container would be a checklist item, not a design decision.

Repo: https://github.com/qhedroid/mediaforge-cuebot

#TypeScript #NodeJS #FFmpeg #SoftwareEngineering

---

Notes:
- Variant A suits a "what I learned building this" post; B suits a quick ship announcement.
- If you want continuity with the TBridge post, open with a line referencing it, e.g. "After TBridge, I wanted the next project to prove a different skill: pipeline design."
- Both variants avoid overclaiming: no "production-ready", no "platform", no download/streaming framing.
