import { SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "./command.js";
import { voiceSessionManager } from "../voice/runtime.js";

export const resumeCommand: CommandModule = {
  data: new SlashCommandBuilder().setName("resume").setDescription("Resume playback."),
  async execute(interaction): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply("Please use /resume inside a Discord server.");
      return;
    }

    const resumed = voiceSessionManager.resume(guildId);
    await interaction.reply(resumed ? "Resumed CueBot playback." : "CueBot playback is not paused.");
  }
};
