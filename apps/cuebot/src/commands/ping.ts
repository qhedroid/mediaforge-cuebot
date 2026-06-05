import { SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "./command.js";

export const pingCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether CueBot is online and responding"),
  async execute(interaction): Promise<void> {
    await interaction.reply("Pong! CueBot is online.");
  }
};
