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
    const query = interaction.options.getString("query", true);
    console.log(
      [
        "/search placeholder received:",
        `query=${query}`,
        `guild=${interaction.guildId ?? "dm"}`,
        `user=${interaction.user.id}`
      ].join(" ")
    );

    await interaction.reply(
      `CueBot received /search for: ${query}. Open/licensed provider search is coming in CueBot 0.2.`
    );
  }
};
