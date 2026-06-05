import { SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "./command.js";
import { voiceSessionManager } from "../voice/runtime.js";

export const nowPlayingCommand: CommandModule = {
  data: new SlashCommandBuilder().setName("nowplaying").setDescription("Show the current track."),
  async execute(interaction): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply("Please use /nowplaying inside a Discord server.");
      return;
    }

    const current = voiceSessionManager.getCurrent(guildId);

    if (!current) {
      await interaction.reply("CueBot is not playing anything right now.");
      return;
    }

    await interaction.reply(
      [
        "Now playing:",
        `Title: ${current.metadata.title}`,
        `Track ID: ${current.id}`,
        `Status: ${current.status}`
      ].join("\n")
    );
  }
};
