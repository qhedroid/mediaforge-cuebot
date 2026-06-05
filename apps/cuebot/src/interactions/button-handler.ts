import {
  deleteCueBotTempFile,
  prepareUrlInput,
  UrlIngestError
} from "@mediaforge/media-core";
import type { ButtonInteraction } from "discord.js";
import { parsePlayButtonId } from "../search/render-search-results.js";
import { searchCache } from "../search/search-cache.js";
import { voiceSessionManager } from "../voice/runtime.js";
import { VoiceSessionError } from "../voice/voice-session.js";

function getFriendlyPlayError(error: unknown): string {
  if (error instanceof UrlIngestError) {
    return error.message;
  }

  if (error instanceof VoiceSessionError) {
    return error.message;
  }

  if (error instanceof Error) {
    return `CueBot could not prepare that track: ${error.message}`;
  }

  return "CueBot could not prepare that track for an unknown reason.";
}

export async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  const parsed = parsePlayButtonId(interaction.customId);

  if (!parsed) {
    return;
  }

  if (interaction.user.id !== parsed.userId) {
    await interaction.reply({
      content: "These search results belong to another user. Run /search to create your own.",
      ephemeral: true
    });
    return;
  }

  await interaction.deferUpdate();

  const guildId = interaction.guildId;

  if (!guildId || !interaction.guild) {
    await interaction.followUp({
      content: "Please use CueBot inside a Discord server.",
      ephemeral: true
    });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

  if (!member?.voice.channel) {
    await interaction.followUp({
      content: "Join a voice channel first, then choose a result.",
      ephemeral: true
    });
    return;
  }

  const track = searchCache.get(guildId, parsed.userId, parsed.resultId);

  if (!track) {
    await interaction.followUp({
      content: "Those search results expired. Run /search again.",
      ephemeral: true
    });
    return;
  }

  if (!track.pageUrl) {
    await interaction.followUp({
      content: "That result cannot be played.",
      ephemeral: true
    });
    return;
  }

  console.log(
    [
      "Button play started:",
      `guild=${guildId}`,
      `user=${interaction.user.id}`,
      `resultId=${parsed.resultId}`,
      `providerId=${track.providerId}`
    ].join(" ")
  );

  let queueItem;

  try {
    queueItem = await prepareUrlInput(
      { url: track.pageUrl },
      { guildId, requestedByUserId: interaction.user.id }
    );
    queueItem.metadata.title = track.title;

    if (track.artist) {
      queueItem.metadata.artist = track.artist;
    }
  } catch (error) {
    console.error(
      `Button play prepareUrlInput failed: guild=${guildId} resultId=${parsed.resultId}`
    );
    await interaction.followUp({
      content: getFriendlyPlayError(error),
      ephemeral: true
    });
    return;
  }

  const preparedFilePath = queueItem.preparedFilePath ?? queueItem.metadata.preparedFilePath ?? "";

  try {
    await voiceSessionManager.ensureSession(guildId, member);
    const queuePosition = voiceSessionManager.enqueue(guildId, queueItem);
    const playbackStart = voiceSessionManager.startIfIdle(guildId);
    const currentTrack = voiceSessionManager.getCurrent(guildId);
    const isPlaying = playbackStart.started || currentTrack?.id === queueItem.id;
    const statusLabel = isPlaying ? "Now playing" : "Queued";

    console.log(
      [
        "Button play completed:",
        `guild=${guildId}`,
        `trackId=${queueItem.id}`,
        `status=${statusLabel}`,
        `queuePosition=${queuePosition}`
      ].join(" ")
    );

    const replyLines: string[] = [
      `${statusLabel}: **${track.title}**`
    ];

    if (track.artist) {
      replyLines.push(`by ${track.artist}`);
    }

    if (!isPlaying) {
      replyLines.push(`Queue position: ${queuePosition}`);
    }

    replyLines.push("Reminder: only use media you have permission to play.");

    await interaction.followUp({
      content: replyLines.join("\n"),
      ephemeral: false
    });
  } catch (error) {
    console.error(
      `Button play voice/queue failed: guild=${guildId} trackId=${queueItem.id}`
    );

    await deleteCueBotTempFile(preparedFilePath).catch((cleanupError: unknown) => {
      const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      console.error(`Button play temp cleanup failed: ${message}`);
    });

    await interaction.followUp({
      content: getFriendlyPlayError(error),
      ephemeral: true
    });
  }
}
