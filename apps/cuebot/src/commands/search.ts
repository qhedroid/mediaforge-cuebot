import { SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "./command.js";
import { executeYouTubeSearch } from "../search/youtube-search-handler.js";

export const searchCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search YouTube and choose a result to play.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Search query")
        .setRequired(true)
    ),
  async execute(interaction): Promise<void> {
    const query = interaction.options.getString("query", true);
    await executeYouTubeSearch(interaction, query, "/search");
  }
};
