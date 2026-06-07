export type SpotifyPlaylistErrorCode =
  | "spotify_credentials_missing"
  | "invalid_spotify_playlist_url"
  | "spotify_auth_failed"
  | "spotify_playlist_failed";

export class SpotifyPlaylistError extends Error {
  constructor(
    readonly code: SpotifyPlaylistErrorCode,
    message: string
  ) {
    super(message);
    this.name = "SpotifyPlaylistError";
  }
}

export interface SpotifyPlaylistTrack {
  title: string;
  artists: string[];
  durationMs?: number;
  spotifyUrl?: string;
}

interface SpotifyTokenResponse {
  access_token?: string;
}

interface SpotifyPlaylistTrackResponse {
  items?: Array<{
    track?: {
      name?: string;
      duration_ms?: number;
      external_urls?: {
        spotify?: string;
      };
      artists?: Array<{
        name?: string;
      }>;
    } | null;
  }>;
  next?: string | null;
}

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new SpotifyPlaylistError(
      "spotify_credentials_missing",
      "Spotify API access is not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your server .env."
    );
  }

  return { clientId, clientSecret };
}

function parsePlaylistId(rawUrl: string): string {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new SpotifyPlaylistError(
      "invalid_spotify_playlist_url",
      "Please provide a valid Spotify playlist URL."
    );
  }

  if (url.hostname !== "open.spotify.com") {
    throw new SpotifyPlaylistError(
      "invalid_spotify_playlist_url",
      "Please provide a valid Spotify playlist URL."
    );
  }

  const [kind, playlistId] = url.pathname.split("/").filter(Boolean);

  if (kind !== "playlist" || !playlistId) {
    throw new SpotifyPlaylistError(
      "invalid_spotify_playlist_url",
      "Please provide a valid Spotify playlist URL."
    );
  }

  return playlistId;
}

async function requestAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials();
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new SpotifyPlaylistError(
      "spotify_auth_failed",
      "Spotify API access failed. Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET."
    );
  }

  const data = (await response.json()) as SpotifyTokenResponse;

  if (!data.access_token) {
    throw new SpotifyPlaylistError(
      "spotify_auth_failed",
      "Spotify API access failed. Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET."
    );
  }

  return data.access_token;
}

function toTrack(item: NonNullable<SpotifyPlaylistTrackResponse["items"]>[number]): SpotifyPlaylistTrack | null {
  const track = item.track;
  const title = track?.name?.trim();

  if (!track || !title) {
    return null;
  }

  const artists =
    track.artists
      ?.map((artist) => artist.name?.trim())
      .filter((name): name is string => Boolean(name)) ?? [];

  return {
    title,
    artists,
    durationMs: track.duration_ms,
    spotifyUrl: track.external_urls?.spotify
  };
}

export async function getSpotifyPlaylistTracks(
  playlistUrl: string,
  limit = 5
): Promise<SpotifyPlaylistTrack[]> {
  const playlistId = parsePlaylistId(playlistUrl);
  const accessToken = await requestAccessToken();
  const safeLimit = Math.max(1, Math.min(limit, 25));
  const fields = "items(track(name,artists(name),duration_ms,external_urls)),next";
  let nextUrl =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${safeLimit}&fields=${encodeURIComponent(fields)}`;
  const tracks: SpotifyPlaylistTrack[] = [];

  console.log(`Spotify playlist metadata import started: playlistId=${playlistId} limit=${safeLimit}`);

  while (nextUrl && tracks.length < safeLimit) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new SpotifyPlaylistError(
        "spotify_playlist_failed",
        "CueBot could not read that Spotify playlist. Check that it exists and is public or accessible."
      );
    }

    const data = (await response.json()) as SpotifyPlaylistTrackResponse;

    for (const item of data.items ?? []) {
      const track = toTrack(item);

      if (track) {
        tracks.push(track);
      }

      if (tracks.length >= safeLimit) {
        break;
      }
    }

    nextUrl = data.next ?? "";
  }

  console.log(`Spotify playlist metadata import completed: playlistId=${playlistId} tracks=${tracks.length}`);
  return tracks;
}
