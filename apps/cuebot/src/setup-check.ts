import { PermissionFlagsBits } from "discord.js";
import { config } from "./config.js";

function maskToken(token: string): string {
  const suffix = token.slice(-4);
  return `********${suffix}`;
}

const permissions =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.UseApplicationCommands |
  PermissionFlagsBits.Connect |
  PermissionFlagsBits.Speak;

const inviteUrl = new URL("https://discord.com/oauth2/authorize");
inviteUrl.searchParams.set("client_id", config.discordClientId);
inviteUrl.searchParams.set("permissions", permissions.toString());
inviteUrl.searchParams.set("scope", "bot applications.commands");
inviteUrl.searchParams.set("guild_id", config.discordGuildId);

console.log("CueBot setup check passed.");
console.log(`DISCORD_TOKEN: set ${maskToken(config.discordToken)}`);
console.log(`DISCORD_CLIENT_ID: ${config.discordClientId}`);
console.log(`DISCORD_GUILD_ID: ${config.discordGuildId}`);
console.log("");
console.log("Invite URL:");
console.log(inviteUrl.toString());
console.log("");
console.log("Next commands:");
console.log("pnpm --filter @mediaforge/cuebot register");
console.log("pnpm --filter @mediaforge/cuebot start");
