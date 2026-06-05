import { SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "./command.js";
import { voiceSessionManager } from "../voice/runtime.js";

export const queueCommand: CommandModule = {
  data: new SlashCommandBuilder().setName("queue").setDescription("Show the current music queue."),
  async execute(interaction): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply("Please use /queue inside a Discord server.");
      return;
    }

    const current = voiceSessionManager.getCurrent(guildId);
    const queued = voiceSessionManager.getQueue(guildId);

    if (!current && queued.length === 0) {
      await interaction.reply("CueBot queue is empty.");
      return;
    }

    const lines = [
      "CueBot queue:",
      current ? `Now playing: ${current.metadata.title} (${current.id})` : "Now playing: nothing",
      ...queued.map((item, index) => `${index + 1}. ${item.metadata.title} (${item.id})`)
    ];

    await interaction.reply(lines.join("\n"));
  }
};
