import { SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "./command.js";
import { providerRegistry } from "../search/provider-runtime.js";
import { searchCache } from "../search/search-cache.js";

function formatDuration(durationMs: number | undefined): string {
  if (typeof durationMs !== "number") {
    return "unknown";
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

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
    await interaction.deferReply({ ephemeral: false });
    console.log(
      [
        "/search received:",
        `query=${query}`,
        `guild=${interaction.guildId ?? "dm"}`,
        `user=${interaction.user.id}`
      ].join(" ")
    );

    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.editReply("Please use /search inside a Discord server.");
      return;
    }

    const providerResults = await providerRegistry.search({ text: query, limit: 5 });
    const tracks = providerResults.flatMap((result) => result.tracks);
    const cachedResults = searchCache.store(guildId, interaction.user.id, tracks);

    if (cachedResults.length === 0) {
      await interaction.editReply(
        "No local/open results found yet. Add tracks to storage/metadata/local-library.json."
      );
      return;
    }

    await interaction.editReply(
      [
        `CueBot local/open search results for: ${query}`,
        "",
        ...cachedResults.map(({ resultId, track }) =>
          [
            `${resultId}. ${track.title} - ${track.artist ?? "Unknown Artist"}`,
            `   Source: ${track.providerId === "local-library" ? "Local Library" : track.providerId}`,
            `   Duration: ${formatDuration(track.durationMs)}`,
            `   Use /play result:${resultId}`
          ].join("\n")
        )
      ].join("\n")
    );
  }
};
