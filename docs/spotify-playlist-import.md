# Spotify Playlist Import

CueBot supports Spotify playlist import as a metadata-only workflow.

`/spotify playlist:<url>`:

1. Reads Spotify playlist metadata through the Spotify Web API.
2. Extracts track title and artist names.
3. Searches for a playable match using the existing search pipeline.
4. Queues the matched result through the existing URL preparation and voice playback path.

CueBot does not rip, download, bypass DRM, or stream directly from Spotify.

## Environment Variables

```text
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_PLAYLIST_IMPORT_LIMIT=5
```

`SPOTIFY_PLAYLIST_IMPORT_LIMIT` defaults to `5` and is capped at `10`.

## Test

1. Create a Spotify developer app.
2. Put `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in the server `.env`.
3. Rebuild and restart CueBot.
4. Re-register commands:

```powershell
pnpm --filter @mediaforge/cuebot register
```

5. Join a voice channel.
6. Run:

```text
/spotify playlist:<spotify_playlist_url>
```

Expected result: CueBot queues up to the configured import limit and replies with queued/skipped counts.
