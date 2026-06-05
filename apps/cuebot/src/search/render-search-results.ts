import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { CachedSearchResult } from "./search-cache.js";

const BUTTON_ID_PREFIX = "cuebot:search-play";

export function buildPlayButtonId(userId: string, resultId: string): string {
  return `${BUTTON_ID_PREFIX}:${userId}:${resultId}`;
}

export interface ParsedPlayButtonId {
  userId: string;
  resultId: string;
}

export function parsePlayButtonId(customId: string): ParsedPlayButtonId | null {
  if (!customId.startsWith(`${BUTTON_ID_PREFIX}:`)) {
    return null;
  }

  const payload = customId.slice(BUTTON_ID_PREFIX.length + 1);
  const separatorIndex = payload.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  const userId = payload.slice(0, separatorIndex);
  const resultId = payload.slice(separatorIndex + 1);

  if (!userId || !resultId) {
    return null;
  }

  return { userId, resultId };
}

function formatDuration(durationMs: number | undefined): string {
  if (typeof durationMs !== "number") {
    return "unknown";
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export interface SearchResultsRender {
  content: string;
  components: ActionRowBuilder<ButtonBuilder>[];
}

export function renderSearchResults(
  query: string,
  userId: string,
  cachedResults: CachedSearchResult[]
): SearchResultsRender {
  const lines: string[] = [`YouTube results for: **${query}**`, ""];

  for (const { resultId, track } of cachedResults) {
    const artist = track.artist ?? "Unknown";
    const duration = formatDuration(track.durationMs);
    lines.push(`**${resultId}.** ${track.title}`, `   ${artist} · ${duration}`, "");
  }

  lines.push("*Only use media you have permission to play.*");

  const buttons = cachedResults.slice(0, 5).map(({ resultId }) =>
    new ButtonBuilder()
      .setCustomId(buildPlayButtonId(userId, resultId))
      .setLabel(`Play ${resultId}`)
      .setStyle(ButtonStyle.Primary)
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

  return { content: lines.join("\n"), components: [row] };
}
