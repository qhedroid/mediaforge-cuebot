import {
  deleteCueBotTempFile,
  getSpotifyPlaylistTracks,
  prepareUrlInput,
  searchYouTube,
  SpotifyPlaylistError,
  UrlIngestError,
  YouTubeSearchError
} from "@mediaforge/media-core";
import type { QueueItem } from "@mediaforge/shared";
import { SlashCommandBuilder, type GuildMember } from "discord.js";
import type { CommandModule } from "./command.js";
import { voiceSessionManager } from "../voice/runtime.js";
import { VoiceSessionError } from "../voice/voice-session.js";

const defaultPlaylistImportLimit = 5;

function getPlaylistImportLimit(): number {
  const rawValue = process.env.SPOTIFY_PLAYLIST_IMPORT_LIMIT;
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : defaultPlaylistImportLimit;

  if (!Number.isFinite(parsed)) {
    return defaultPlaylistImportLimit;
  }

  return Math.max(1, Math.min(parsed, 10));
}

function getFriendlyError(error: unknown): string {
  if (error instanceof SpotifyPlaylistError) {
    return error.message;
  }

  if (error instanceof YouTubeSearchError) {
    if (error.code === "ytdlp_missing") {
      return "yt-dlp could not be found. Install yt-dlp or set YTDLP_PATH in your server .env.";
    }

    return "CueBot could not match one or more Spotify tracks to playable search results.";
  }

  if (error instanceof UrlIngestError || error instanceof VoiceSessionError) {
    return error.message;
  }

  if (error instanceof Error) {
    return `CueBot could not import that Spotify playlist: ${error.message}`;
  }

  return "CueBot could not import that Spotify playlist.";
}

async function getGuildMember(interaction: Parameters<CommandModule["execute"]>[0]): Promise<GuildMember> {
  if (!interaction.guild) {
    throw new VoiceSessionError("Please use this command inside a Discord server.");
  }

  return interaction.guild.members.fetch(interaction.user.id);
}

async function queuePreparedItem(
  guildId: string,
  member: GuildMember,
  item: QueueItem
): Promise<{ queuePosition: number; started: boolean }> {
  await voiceSessionManager.ensureSession(guildId, member);
  const queuePosition = voiceSessionManager.enqueue(guildId, item);
  const playbackStart = voiceSessionManager.startIfIdle(guildId);
  const currentTrack = voiceSessionManager.getCurrent(guildId);
  const started = playbackStart.started || currentTrack?.id === item.id;

  return { queuePosition, started };
}

export const spotifyCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("spotify")
    .setDescription("Import Spotify playlist metadata and queue matched playable results.")
    .addStringOption((option) =>
      option
        .setName("playlist")
        .setDescription("Spotify playlist URL")
        .setRequired(true)
    ),
  async execute(interaction): Promise<void> {
    await interaction.deferReply({ ephemeral: false });

    const playlistUrl = interaction.options.getString("playlist", true);
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.editReply("Please use this command inside a Discord server.");
      return;
    }

    const member = await getGuildMember(interaction).catch(() => null);

    if (!member?.voice.channel) {
      await interaction.editReply("Join a voice channel before importing a Spotify playlist.");
      return;
    }

    const importLimit = getPlaylistImportLimit();
    const tempFilesToCleanOnError: string[] = [];
    let imported = 0;
    const skipped: string[] = [];

    console.log(
      `Spotify playlist command started: guild=${guildId} user=${interaction.user.id} limit=${importLimit}`
    );

    try {
      await interaction.editReply(`Reading Spotify playlist metadata, then importing up to ${importLimit} tracks...`);
      const spotifyTracks = await getSpotifyPlaylistTracks(playlistUrl, importLimit);

      if (spotifyTracks.length === 0) {
        await interaction.editReply("That Spotify playlist did not contain importable track metadata.");
        return;
      }

      for (const spotifyTrack of spotifyTracks) {
        const artist = spotifyTrack.artists[0];
        const searchQuery = [spotifyTrack.title, artist].filter(Boolean).join(" ");
        let preparedFilePath: string | undefined;

        try {
          const [match] = await searchYouTube(searchQuery, 1);

          if (!match?.pageUrl) {
            skipped.push(spotifyTrack.title);
            continue;
          }

          const queueItem = await prepareUrlInput(
            { url: match.pageUrl },
            { guildId, requestedByUserId: interaction.user.id }
          );
          queueItem.metadata.title = spotifyTrack.title;
          queueItem.metadata.artist = spotifyTrack.artists.join(", ") || match.artist;
          queueItem.metadata.durationMs = spotifyTrack.durationMs ?? queueItem.metadata.durationMs;
          queueItem.metadata.attributionUrl = spotifyTrack.spotifyUrl;
          queueItem.metadata.license = "Spotify metadata only; playback resolved through permitted search result.";

          preparedFilePath = queueItem.preparedFilePath ?? queueItem.metadata.preparedFilePath;

          if (preparedFilePath) {
            tempFilesToCleanOnError.push(preparedFilePath);
          }

          await queuePreparedItem(guildId, member, queueItem);
          imported += 1;
          tempFilesToCleanOnError.length = 0;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Spotify track import skipped: title=${spotifyTrack.title} message=${message}`);

          if (preparedFilePath) {
            await deleteCueBotTempFile(preparedFilePath).catch((cleanupError: unknown) => {
              const cleanupMessage =
                cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
              console.error(`Spotify skipped track temp cleanup failed: ${cleanupMessage}`);
            });
            const index = tempFilesToCleanOnError.indexOf(preparedFilePath);

            if (index >= 0) {
              tempFilesToCleanOnError.splice(index, 1);
            }
          }

          skipped.push(spotifyTrack.title);
        }
      }

      const lines = [
        `Spotify playlist import complete.`,
        `Queued tracks: ${imported}`,
        `Skipped tracks: ${skipped.length}`,
        "Spotify was used for playlist metadata only. CueBot did not download, stream, or bypass Spotify audio."
      ];

      if (skipped.length > 0) {
        lines.push(`Skipped: ${skipped.slice(0, 5).join(", ")}`);
      }

      await interaction.editReply(lines.join("\n"));
    } catch (error) {
      await Promise.all(
        tempFilesToCleanOnError.map((filePath) =>
          deleteCueBotTempFile(filePath).catch((cleanupError: unknown) => {
            const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
            console.error(`Spotify import temp cleanup failed: ${message}`);
          })
        )
      );

      await interaction.editReply(getFriendlyError(error));
    }
  }
};
