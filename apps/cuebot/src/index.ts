import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { config } from "./config.js";
import type { CommandModule } from "./commands/command.js";
import { cuebotCommands } from "./commands/index.js";

const commands = new Collection<string, CommandModule>();

for (const command of cuebotCommands) {
  commands.set(command.data.name, command);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

function getSafeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function sendSafeErrorResponse(
  interaction: Parameters<CommandModule["execute"]>[0],
  content: string
): Promise<void> {
  try {
    if (interaction.deferred) {
      await interaction.editReply(content);
      return;
    }

    if (interaction.replied) {
      await interaction.followUp(content);
      return;
    }

    await interaction.reply(content);
  } catch (error) {
    console.error(`Failed to send interaction error response: ${getSafeErrorMessage(error)}`);
  }
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`CueBot logged in as ${readyClient.user.tag}.`);
  console.log(`Loaded slash commands: ${commands.map((command) => command.data.name).join(", ")}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const userLabel = interaction.user.tag ?? interaction.user.id;
  console.log(
    [
      `Received /${interaction.commandName}`,
      `guild=${interaction.guildId ?? "dm"}`,
      `channel=${interaction.channelId ?? "unknown"}`,
      `user=${userLabel}`
    ].join(" ")
  );

  const command = commands.get(interaction.commandName);

  if (!command) {
    await sendSafeErrorResponse(interaction, `CueBot does not recognize /${interaction.commandName}.`);
    return;
  }

  try {
    await command.execute(interaction);
    console.log(`Successfully handled /${interaction.commandName}.`);
  } catch (error) {
    console.error(
      `Error executing /${interaction.commandName}: ${getSafeErrorMessage(error)}`
    );

    await sendSafeErrorResponse(interaction, "CueBot hit an error while handling that command.");
  }
});

await client.login(config.discordToken);
