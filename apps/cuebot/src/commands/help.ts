import { SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "./command.js";

export const helpCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show CueBot commands and basic usage."),
  async execute(interaction): Promise<void> {
    await interaction.reply({
      content: [
        "**CueBot commands**",
        "",
        "`/search query:<song>` - search YouTube and choose a result",
        "`/spotify playlist:<url>` - import Spotify playlist metadata and queue matched results",
        "`/play attachment:<file>` - play an uploaded audio/video file",
        "`/play url:<url>` - play a direct media or supported URL",
        "`/queue` - show the queue",
        "`/nowplaying` - show the current track",
        "`/pause` - pause playback",
        "`/resume` - resume playback",
        "`/skip` - skip current track",
        "`/stop` - stop playback and clear queue",
        "`/ping` - check bot status",
        "",
        "Join a voice channel before using `/play` or selecting a search result.",
        "Spotify is used for playlist metadata only; CueBot does not stream or download Spotify audio.",
        "Only use media you have permission to play."
      ].join("\n"),
      ephemeral: false
    });
  }
};
