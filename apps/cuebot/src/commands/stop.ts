import { SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "./command.js";
import { voiceSessionManager } from "../voice/runtime.js";

export const stopCommand: CommandModule = {
  data: new SlashCommandBuilder().setName("stop").setDescription("Stop playback and clear the queue."),
  async execute(interaction): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply("Please use /stop inside a Discord server.");
      return;
    }

    const clearedItems = await voiceSessionManager.stop(guildId);
    await interaction.reply(
      clearedItems.length > 0
        ? `Stopped CueBot playback, cleared ${clearedItems.length} track(s), and disconnected.`
        : "CueBot playback is already stopped."
    );
  }
};
