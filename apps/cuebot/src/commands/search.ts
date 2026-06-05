import { SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "./command.js";

export const searchCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search open or licensed music providers.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Search open/licensed music providers")
        .setRequired(true)
    ),
  async execute(interaction): Promise<void> {
    await interaction.reply("CueBot received /search. Open/licensed provider search is coming in CueBot 0.2.");
  }
};
