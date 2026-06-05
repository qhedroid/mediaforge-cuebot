import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

function findDotenvPath(startDirectory: string): string | undefined {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    const candidate = path.join(currentDirectory, ".env");

    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return undefined;
    }

    currentDirectory = parentDirectory;
  }
}

const dotenvPath = findDotenvPath(process.cwd());

if (dotenvPath) {
  dotenv.config({ path: dotenvPath });
}

export interface CueBotConfig {
  discordToken: string;
  discordClientId: string;
  discordGuildId: string;
  ffmpegPath?: string;
  ffprobePath?: string;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      [
        `Missing required CueBot environment variable: ${name}`,
        "",
        "Create .env in the repository root.",
        "Required keys:",
        "  DISCORD_TOKEN",
        "  DISCORD_CLIENT_ID",
        "  DISCORD_GUILD_ID",
        "",
        "Then run:",
        "  pnpm --filter @mediaforge/cuebot setup:check"
      ].join("\n")
    );
  }

  return value;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function prependDirectoryToPath(filePath: string | undefined): void {
  if (!filePath) {
    return;
  }

  const directoryPath = path.dirname(filePath);
  const currentPath = process.env.PATH ?? "";
  const pathParts = currentPath.split(path.delimiter).filter(Boolean);
  const alreadyPresent = pathParts.some((entry) => path.resolve(entry) === path.resolve(directoryPath));

  if (!alreadyPresent) {
    process.env.PATH = [directoryPath, currentPath].filter(Boolean).join(path.delimiter);
  }
}

const ffmpegPath = optionalEnv("FFMPEG_PATH");
const ffprobePath = optionalEnv("FFPROBE_PATH");

prependDirectoryToPath(ffmpegPath);

export const config: CueBotConfig = {
  discordToken: requireEnv("DISCORD_TOKEN"),
  discordClientId: requireEnv("DISCORD_CLIENT_ID"),
  discordGuildId: requireEnv("DISCORD_GUILD_ID"),
  ffmpegPath,
  ffprobePath
};
