import {
  AttachmentIngestError,
  deleteCueBotTempFile,
  ensureDiscordPlayableAudio,
  FfmpegError,
  FfprobeError,
  humanReadableFileSize,
  prepareAttachmentInput,
  prepareUrlInput,
  UrlIngestError
} from "@mediaforge/media-core";
import type { ProviderTrack, QueueItem } from "@mediaforge/shared";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { SlashCommandBuilder, type GuildMember } from "discord.js";
import type { CommandModule } from "./command.js";
import { searchCache } from "../search/search-cache.js";
import { voiceSessionManager } from "../voice/runtime.js";
import { VoiceSessionError } from "../voice/voice-session.js";

function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof AttachmentIngestError) {
    return error.message;
  }

  if (error instanceof UrlIngestError) {
    return error.message;
  }

  if (error instanceof FfmpegError) {
    return "FFmpeg is missing or failed. Install FFmpeg and make sure it is available on PATH.";
  }

  if (error instanceof FfprobeError) {
    return "FFprobe could not inspect this file. Check FFmpeg/FFprobe installation or try another audio file.";
  }

  if (error instanceof VoiceSessionError) {
    return error.message;
  }

  if (error instanceof Error) {
    return `CueBot could not queue that attachment: ${error.message}`;
  }

  return "CueBot could not queue that attachment for an unknown reason.";
}

function getSafeUrlHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return "invalid-url";
  }
}

async function getGuildMember(interaction: Parameters<CommandModule["execute"]>[0]): Promise<GuildMember> {
  if (!interaction.guild) {
    throw new Error("Please use /play inside a Discord server.");
  }

  return interaction.guild.members.fetch(interaction.user.id);
}

async function queuePlayableItem(
  guildId: string,
  member: GuildMember,
  queueItem: QueueItem
): Promise<{
  queuePosition: number;
  status: "Queued and playing" | "Queued";
  playbackWarning: string[];
}> {
  await voiceSessionManager.ensureSession(guildId, member);
  console.log(`/play voice session ready: guild=${guildId} trackId=${queueItem.id}`);
  console.log(`/play queue enqueue started: guild=${guildId} trackId=${queueItem.id}`);
  const queuePosition = voiceSessionManager.enqueue(guildId, queueItem);
  console.log(`/play queue enqueue completed: guild=${guildId} trackId=${queueItem.id} queuePosition=${queuePosition}`);
  console.log(`/play playback start requested: guild=${guildId} trackId=${queueItem.id}`);
  const playbackStart = voiceSessionManager.startIfIdle(guildId);
  console.log(
    `/play playback start completed: guild=${guildId} trackId=${queueItem.id} started=${playbackStart.started} reason=${playbackStart.reason ?? "none"}`
  );
  const currentTrack = voiceSessionManager.getCurrent(guildId);
  const status = playbackStart.started || currentTrack?.id === queueItem.id ? "Queued and playing" : "Queued";
  const playbackWarning =
    !playbackStart.started && !currentTrack
      ? [`Playback did not start: ${playbackStart.reason ?? "unknown reason"}`]
      : [];

  return { queuePosition, status, playbackWarning };
}

function createProviderQueueItem(
  guildId: string,
  userId: string,
  track: ProviderTrack,
  preparedFilePath: string
): QueueItem {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  return {
    id,
    guildId,
    requestedByUserId: userId,
    status: "ready",
    preparedFilePath,
    enqueuedAt: createdAt,
    metadata: {
      id,
      title: track.title,
      artist: track.artist,
      durationMs: track.durationMs,
      sourceType: "provider_track",
      sourceUri: track.filePath,
      preparedFilePath,
      license: track.license,
      createdAt
    }
  };
}

export const playCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Queue user-provided media for playback.")
    .addAttachmentOption((option) =>
      option
        .setName("attachment")
        .setDescription("Audio or video file to queue")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Legally permitted media URL to prepare and play")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("result")
        .setDescription("Dev-only result number from /search")
        .setRequired(false)
    ),
  async execute(interaction): Promise<void> {
    const attachment = interaction.options.getAttachment("attachment");
    const url = interaction.options.getString("url");
    const resultId = interaction.options.getString("result");

    if (!attachment && !url && !resultId) {
      await interaction.reply("Please attach an audio/video file, use /play url:<url>, or use /play result:<id> after /search.");
      return;
    }

    await interaction.deferReply({ ephemeral: false });

    if (attachment) {
      console.log(
        [
          "/play attachment received:",
          `filename=${attachment.name}`,
          `size=${attachment.size}`,
          `contentType=${attachment.contentType ?? "unknown"}`
        ].join(" ")
      );
    } else if (url) {
      console.log(`/play url received: guild=${interaction.guildId ?? "dm"} user=${interaction.user.id} host=${getSafeUrlHost(url)}`);
    } else {
      console.log(`/play result received: result=${resultId ?? "missing"} guild=${interaction.guildId ?? "dm"} user=${interaction.user.id}`);
    }

    const tempFilesToCleanOnError: string[] = [];

    try {
      const guildId = interaction.guildId;

      if (!guildId) {
        await interaction.editReply("Please use /play inside a Discord server.");
        return;
      }

      const member = await getGuildMember(interaction);
      console.log(`/play voice channel check: guild=${guildId} user=${interaction.user.id}`);

      if (!member.voice.channel) {
        await interaction.editReply("Please join a voice channel before using /play.");
        return;
      }

      if (!attachment && url) {
        console.log(`/play direct URL preparation started: guild=${guildId} host=${getSafeUrlHost(url)}`);
        const queueItem = await prepareUrlInput(
          { url },
          {
            guildId,
            requestedByUserId: interaction.user.id
          }
        );
        tempFilesToCleanOnError.push(queueItem.preparedFilePath ?? queueItem.metadata.preparedFilePath ?? "");
        console.log(
          `/play direct URL preparation completed: guild=${guildId} host=${getSafeUrlHost(url)} trackId=${queueItem.id} preparedFilePath=${queueItem.preparedFilePath ?? "missing"} durationMs=${queueItem.metadata.durationMs ?? "unknown"}`
        );
        console.log(`/play playback start requested for direct URL: guild=${guildId} trackId=${queueItem.id}`);
        const queueResult = await queuePlayableItem(guildId, member, queueItem);
        tempFilesToCleanOnError.length = 0;

        await interaction.editReply(
          [
            queueResult.status,
            `Title: ${queueItem.metadata.title}`,
            `Source: ${queueItem.metadata.sourceUri}`,
            `Track ID: ${queueItem.id}`,
            `Queue position: ${queueResult.status === "Queued and playing" ? 0 : queueResult.queuePosition}`,
            "Reminder: only use media you own or have permission to play.",
            ...queueResult.playbackWarning
          ].join("\n")
        );
        return;
      }

      if (!attachment && resultId) {
        const track = searchCache.get(guildId, interaction.user.id, resultId);

        if (!track) {
          await interaction.editReply("That search result expired or was not found. Run /search again.");
          return;
        }

        if (!track.filePath && !track.pageUrl) {
          await interaction.editReply("That result does not have a playable source.");
          return;
        }

        if (!track.filePath && track.pageUrl) {
          console.log(
            `/play result url resolver started: providerTrackId=${track.id} providerId=${track.providerId} host=${getSafeUrlHost(track.pageUrl)}`
          );
          const queueItem = await prepareUrlInput(
            { url: track.pageUrl },
            { guildId, requestedByUserId: interaction.user.id }
          );
          queueItem.metadata.title = track.title;
          if (track.artist) {
            queueItem.metadata.artist = track.artist;
          }
          tempFilesToCleanOnError.push(queueItem.preparedFilePath ?? queueItem.metadata.preparedFilePath ?? "");
          console.log(
            `/play result url resolver completed: providerTrackId=${track.id} trackId=${queueItem.id} preparedFilePath=${queueItem.preparedFilePath ?? "missing"}`
          );
          const queueResult = await queuePlayableItem(guildId, member, queueItem);
          tempFilesToCleanOnError.length = 0;

          await interaction.editReply(
            [
              queueResult.status,
              `Title: ${track.title}`,
              `Artist: ${track.artist ?? "Unknown"}`,
              `Track ID: ${queueItem.id}`,
              `Queue position: ${queueResult.status === "Queued and playing" ? 0 : queueResult.queuePosition}`,
              "Reminder: only use media you own or have permission to play.",
              ...queueResult.playbackWarning
            ].join("\n")
          );
          return;
        }

        const sourceFilePath = path.resolve(track.filePath ?? "");

        if (!existsSync(sourceFilePath)) {
          await interaction.editReply(`Local library file is missing for result ${resultId}.`);
          return;
        }

        console.log(`/play result ffprobe started: providerTrackId=${track.id} path=${sourceFilePath}`);
        const playableAudio = await ensureDiscordPlayableAudio(sourceFilePath);
        console.log(
          `/play result ffprobe completed: providerTrackId=${track.id} durationMs=${playableAudio.metadata.durationMs ?? "unknown"} codec=${playableAudio.metadata.codecName ?? "unknown"}`
        );

        if (playableAudio.converted) {
          tempFilesToCleanOnError.push(playableAudio.preparedFilePath);
        }

        const queueItem = createProviderQueueItem(
          guildId,
          interaction.user.id,
          {
            ...track,
            durationMs: playableAudio.metadata.durationMs ?? track.durationMs
          },
          playableAudio.preparedFilePath
        );
        const queueResult = await queuePlayableItem(guildId, member, queueItem);
        tempFilesToCleanOnError.length = 0;

        await interaction.editReply(
          [
            queueResult.status,
            `Title: ${track.title}`,
            `Artist: ${track.artist ?? "Unknown Artist"}`,
            `Track ID: ${queueItem.id}`,
            `Queue position: ${queueResult.status === "Queued and playing" ? 0 : queueResult.queuePosition}`,
            ...queueResult.playbackWarning
          ].join("\n")
        );
        return;
      }

      if (attachment && resultId) {
        console.log("/play received both attachment and result; using attachment.");
      }

      if (attachment && url) {
        console.log("/play received both attachment and url; using attachment.");
      }

      if (!attachment) {
        await interaction.editReply("Please attach an audio/video file, use /play url:<url>, or use /play result:<id> after /search.");
        return;
      }

      console.log(`/play ingestion started: filename=${attachment.name}`);
      const queueItem = await prepareAttachmentInput(
        {
          filename: attachment.name,
          contentType: attachment.contentType ?? undefined,
          sizeBytes: attachment.size,
          url: attachment.url
        },
        {
          guildId: interaction.guildId ?? undefined,
          requestedByUserId: interaction.user.id
        }
      );
      console.log(
        `/play ingestion completed: trackId=${queueItem.id} preparedFilePath=${queueItem.preparedFilePath ?? "missing"}`
      );
      const originalPreparedFilePath = queueItem.preparedFilePath;

      if (originalPreparedFilePath) {
        tempFilesToCleanOnError.push(originalPreparedFilePath);
      }

      console.log(`/play ffprobe started: trackId=${queueItem.id}`);
      const inputExtension = originalPreparedFilePath ? originalPreparedFilePath.split(".").pop()?.toLowerCase() : "";
      console.log(
        inputExtension === "mp3"
          ? `/play conversion skipped: trackId=${queueItem.id} reason=mp3`
          : `/play conversion started: trackId=${queueItem.id} inputExtension=${inputExtension ?? "unknown"}`
      );
      const playableAudio = await ensureDiscordPlayableAudio(queueItem.preparedFilePath ?? "");
      console.log(
        `/play ffprobe completed: trackId=${queueItem.id} durationMs=${playableAudio.metadata.durationMs ?? "unknown"} codec=${playableAudio.metadata.codecName ?? "unknown"}`
      );
      console.log(
        playableAudio.converted
          ? `/play conversion completed: trackId=${queueItem.id} preparedFilePath=${playableAudio.preparedFilePath}`
          : `/play conversion skipped completed: trackId=${queueItem.id}`
      );
      tempFilesToCleanOnError.push(playableAudio.preparedFilePath);

      if (playableAudio.converted && originalPreparedFilePath) {
        await deleteCueBotTempFile(originalPreparedFilePath);
        tempFilesToCleanOnError.splice(tempFilesToCleanOnError.indexOf(originalPreparedFilePath), 1);
      }

      queueItem.preparedFilePath = playableAudio.preparedFilePath;
      queueItem.metadata.preparedFilePath = playableAudio.preparedFilePath;
      queueItem.metadata.durationMs = playableAudio.metadata.durationMs;
      const queueResult = await queuePlayableItem(guildId, member, queueItem);
      tempFilesToCleanOnError.length = 0;

      await interaction.editReply(
        [
          queueResult.status,
          `Filename: ${queueItem.metadata.originalFileName ?? attachment.name}`,
          `File size: ${humanReadableFileSize(queueItem.metadata.sizeBytes ?? attachment.size)}`,
          `Track ID: ${queueItem.id}`,
          `Queue position: ${queueResult.status === "Queued and playing" ? 0 : queueResult.queuePosition}`,
          ...(resultId || url ? ["Attachment provided too, so CueBot used the attachment."] : []),
          ...queueResult.playbackWarning
        ].join("\n")
      );
    } catch (error) {
      await Promise.all(
        tempFilesToCleanOnError.map((filePath) =>
          deleteCueBotTempFile(filePath).catch((cleanupError: unknown) => {
            const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
            console.error(`Failed to clean up failed /play temp file: ${message}`);
          })
        )
      );
      try {
        await interaction.editReply(getFriendlyErrorMessage(error));
      } catch (replyError) {
        const message = replyError instanceof Error ? replyError.message : String(replyError);
        console.error(`Failed to send /play error response: ${message}`);
      }
    }
  }
};
