import { SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "./command.js";
import { executeYouTubeSearch } from "../search/youtube-search-handler.js";

export const ytSearchCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("ytsearch")
    .setDescription("Alias for /search — use /search query:<text> instead.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Search query")
        .setRequired(true)
    ),
  async execute(interaction): Promise<void> {
    const query = interaction.options.getString("query", true);
    await executeYouTubeSearch(interaction, query, "/ytsearch");
  }
};
