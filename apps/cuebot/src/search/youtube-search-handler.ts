import { searchYouTube, YouTubeSearchError } from "@mediaforge/media-core";
import type { ChatInputCommandInteraction } from "discord.js";
import { searchCache } from "./search-cache.js";
import { renderSearchResults } from "./render-search-results.js";

function getFriendlySearchError(error: unknown): string {
  if (error instanceof YouTubeSearchError) {
    switch (error.code) {
      case "ytdlp_missing":
        return "yt-dlp could not be found. Install yt-dlp or set YTDLP_PATH in your root .env.";
      case "no_results":
        return "No results found. Try a different search.";
      case "invalid_query":
        return error.message;
      default:
        return "CueBot could not search right now. Try again in a moment.";
    }
  }

  return "CueBot could not search right now. Try again in a moment.";
}

export async function executeYouTubeSearch(
  interaction: ChatInputCommandInteraction,
  query: string,
  commandLabel: string
): Promise<void> {
  await interaction.deferReply({ ephemeral: false });

  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.editReply("Please use this command inside a Discord server.");
    return;
  }

  console.log(
    [
      `${commandLabel} search started:`,
      `guild=${guildId}`,
      `user=${interaction.user.id}`
    ].join(" ")
  );

  let tracks;

  try {
    tracks = await searchYouTube(query, 5);
  } catch (error) {
    console.error(`${commandLabel} search failed: guild=${guildId} user=${interaction.user.id}`);

    try {
      await interaction.editReply(getFriendlySearchError(error));
    } catch (replyError) {
      const message = replyError instanceof Error ? replyError.message : String(replyError);
      console.error(`Failed to send ${commandLabel} error reply: ${message}`);
    }

    return;
  }

  const cachedResults = searchCache.store(guildId, interaction.user.id, tracks);

  console.log(
    `${commandLabel} search completed: guild=${guildId} results=${cachedResults.length}`
  );

  const { content, components } = renderSearchResults(query, interaction.user.id, cachedResults);
  await interaction.editReply({ content, components });
}
