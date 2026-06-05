import { SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "./command.js";
import { voiceSessionManager } from "../voice/runtime.js";

export const skipCommand: CommandModule = {
  data: new SlashCommandBuilder().setName("skip").setDescription("Skip the current track."),
  async execute(interaction): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply("Please use /skip inside a Discord server.");
      return;
    }

    const skipped = voiceSessionManager.skip(guildId);
    await interaction.reply(
      skipped ? `Skipped ${skipped.metadata.title}.` : "CueBot is not currently playing anything."
    );
  }
};
