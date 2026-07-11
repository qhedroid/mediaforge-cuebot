# MediaForge Public Launch Checklist

Status as of 7 July 2026: the repository is complete and live. README, docs, tests, and CI are all merged to `master` (PR #2), the repo is public, and all three GitHub Actions runs are green, including CI #3 on `master`.

This folder is untracked. Do not commit it; it is working material for the launch, not part of the project.

## Done and verified

- [x] README launch-ready, all doc links resolve
- [x] docs/architecture.md complete and linked
- [x] 8 meaningful tests, all passing locally and in CI
- [x] .github/workflows/ci.yml valid, green on push, PR, and master
- [x] Typecheck and build pass
- [x] No TODO/FIXME in source
- [x] Honest positioning: no Docker, downloader, piracy, DRM, SaaS, or enterprise claims
- [x] Repo public, topics set (nodejs, typescript, ffmpeg, portfolio-project, etc.)
- [x] Demo assets generated (see `assets/`)

## Remaining GitHub UI actions (2 to 5 minutes)

1. **Update the repo description.** It currently leads with CueBot:
   > "CueBot is a TypeScript Discord music bot powered by MediaForge..."

   For MediaForge-led portfolio positioning, use the About gear icon on the repo homepage and replace with:
   > "MediaForge is a local-first batch media processing pipeline for repeatable media asset workflows. Includes CueBot, a companion Discord playback bot built on the same media-core."

2. **Capture screenshots** (browser screenshots could not be saved to disk from this session):
   - Repo homepage with README render: https://github.com/qhedroid/mediaforge-cuebot
   - Green CI runs: https://github.com/qhedroid/mediaforge-cuebot/actions
   - Merged PR: https://github.com/qhedroid/mediaforge-cuebot/pull/2

3. **Optional polish** (nice signals, not blockers):
   - Pin the repo on your GitHub profile alongside TBridge
   - Create a `v0.1.0` release from master (Releases > Create a new release) so the sidebar shows a release
   - Add a CI status badge to the README (one line; I can prepare the commit if you approve a push)

## Launch assets in `assets/`

- `mediaforge-dryrun-demo.png` — terminal render of the real dry-run command and output, plus the passing test summary. Use as the LinkedIn post image.
- `mediaforge-dryrun-demo.gif` — animated version (command typed, plan revealed). Use as post media if you prefer motion; LinkedIn plays GIFs uploaded as images via GIPHY only, so attach it as a video conversion or use the PNG.

Both show the genuine CLI command and genuine output, no staged content.

## LinkedIn

Post draft: `linkedin-post.md` (two length variants). Suggested posting time: Tue–Thu morning UK time for reach, but post when it suits.
