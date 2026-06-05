import {
  AttachmentIngestError,
  deleteCueBotTempFile,
  ensureDiscordPlayableAudio,
  FfmpegError,
  FfprobeError,
  humanReadableFileSize,
  prepareAttachmentInput
} from "@mediaforge/media-core";
import { SlashCommandBuilder, type GuildMember } from "discord.js";
import type { CommandModule } from "./command.js";
import { voiceSessionManager } from "../voice/runtime.js";
import { VoiceSessionError } from "../voice/voice-session.js";

function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof AttachmentIngestError) {
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

async function getGuildMember(interaction: Parameters<CommandModule["execute"]>[0]): Promise<GuildMember> {
  if (!interaction.guild) {
    throw new Error("Please use /play inside a Discord server.");
  }

  return interaction.guild.members.fetch(interaction.user.id);
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
    ),
  async execute(interaction): Promise<void> {
    const attachment = interaction.options.getAttachment("attachment");

    if (!attachment) {
      await interaction.reply("Please attach an audio/video file for CueBot 0.1.");
      return;
    }

    await interaction.deferReply({ ephemeral: false });
    console.log(
      [
        "/play attachment received:",
        `filename=${attachment.name}`,
        `size=${attachment.size}`,
        `contentType=${attachment.contentType ?? "unknown"}`
      ].join(" ")
    );

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
      await voiceSessionManager.ensureSession(guildId, member);
      console.log(`/play voice session ready: guild=${guildId} trackId=${queueItem.id}`);
      console.log(`/play queue enqueue started: guild=${guildId} trackId=${queueItem.id}`);
      const queuePosition = voiceSessionManager.enqueue(guildId, queueItem);
      console.log(`/play queue enqueue completed: guild=${guildId} trackId=${queueItem.id} queuePosition=${queuePosition}`);
      tempFilesToCleanOnError.length = 0;
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

      await interaction.editReply(
        [
          status,
          `Filename: ${queueItem.metadata.originalFileName ?? attachment.name}`,
          `File size: ${humanReadableFileSize(queueItem.metadata.sizeBytes ?? attachment.size)}`,
          `Track ID: ${queueItem.id}`,
          `Queue position: ${status === "Queued and playing" ? 0 : queuePosition}`,
          ...playbackWarning
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
      await interaction.editReply(getFriendlyErrorMessage(error));
    }
  }
};
