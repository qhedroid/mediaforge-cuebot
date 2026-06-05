import { SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "./command.js";
import { voiceSessionManager } from "../voice/runtime.js";

export const pauseCommand: CommandModule = {
  data: new SlashCommandBuilder().setName("pause").setDescription("Pause playback."),
  async execute(interaction): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply("Please use /pause inside a Discord server.");
      return;
    }

    const paused = voiceSessionManager.pause(guildId);
    await interaction.reply(paused ? "Paused CueBot playback." : "CueBot is not currently playing audio.");
  }
};
