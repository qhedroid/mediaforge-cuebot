# CueBot 0.2 Plan

CueBot 0.2 adds open/licensed provider search while keeping CueBot focused on Discord commands, voice sessions, queues, and embeds.

## Current Foundation

CueBot 0.2 starts with `LocalLibraryProvider`.

The local provider reads metadata from:

```text
storage/metadata/local-library.json
```

Expected shape:

```json
[
  {
    "id": "sample-track-1",
    "title": "Sample Track",
    "artist": "Local Library",
    "durationMs": 120000,
    "filePath": "storage/mediaforge-output/sample-track.mp3",
    "license": "User-provided/local test file",
    "attributionText": "Local test media"
  }
]
```

Search matches title and artist case-insensitively. Results are cached per guild and user for a short local session window so `/play result:<id>` can queue and play a selected local result.

## Commands

```text
/search query:<text>
/play result:<result_id>
```

`/play attachment:<file>` remains supported from CueBot 0.1.

## Planned Providers

Jamendo is planned next as the first external open/licensed provider integration.

Internet Archive is planned later.

YouTube support is not part of CueBot 0.2.

MediaForge URL playback remains planned for CueBot 1.0.
