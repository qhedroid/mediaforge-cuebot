import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import { cuebotCommands } from "./commands/index.js";

const rest = new REST({ version: "10" }).setToken(config.discordToken);
const commandData = cuebotCommands.map((command) => command.data.toJSON());

console.log(
  `Registering ${commandData.length} CueBot slash commands to guild ${config.discordGuildId}...`
);

await rest.put(
  Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId),
  { body: commandData }
);

console.log("CueBot slash commands registered successfully.");
