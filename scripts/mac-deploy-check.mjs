import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const requiredEnvKeys = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID"
];

function run(command, args = []) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false
  });

  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? result.error?.message ?? "").trim()
  };
}

function printCheck(label, ok, detail = "") {
  const prefix = ok ? "PASS" : "FAIL";
  console.log(`${prefix} ${label}${detail ? ` - ${detail}` : ""}`);
}

function parseMajorVersion(output) {
  const match = output.match(/v?(\d+)/);
  return match ? Number.parseInt(match[1], 10) : Number.NaN;
}

function loadDotenv(filePath) {
  const values = new Map();

  if (!existsSync(filePath)) {
    return values;
  }

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }

    const [name, ...parts] = line.split("=");
    const value = parts.join("=").trim().replace(/^"|"$/g, "");
    values.set(name.trim(), value);
  }

  return values;
}

let failed = false;

const node = run("node", ["--version"]);
const nodeMajor = parseMajorVersion(node.stdout);
const nodeOk = node.ok && nodeMajor >= 22;
printCheck("Node.js 22+", nodeOk, node.stdout || node.stderr || "not found");
failed ||= !nodeOk;

const pnpm = run("pnpm", ["--version"]);
const pnpmMajor = parseMajorVersion(pnpm.stdout);
const pnpmOk = pnpm.ok && pnpmMajor >= 9;
printCheck("pnpm 9+", pnpmOk, pnpm.stdout || pnpm.stderr || "not found");
failed ||= !pnpmOk;

for (const executable of ["ffmpeg", "ffprobe", "yt-dlp"]) {
  const versionArgs = executable === "yt-dlp" ? ["--version"] : ["-version"];
  const result = run(executable, versionArgs);
  const firstLine = (result.stdout || result.stderr).split(/\r?\n/)[0] ?? "";
  printCheck(`${executable} available`, result.ok, firstLine || "not found");
  failed ||= !result.ok;
}

const envPath = path.join(process.cwd(), ".env");
const envExists = existsSync(envPath);
printCheck(".env exists", envExists, envExists ? envPath : "create .env in the repo root");
failed ||= !envExists;

const envValues = loadDotenv(envPath);

for (const key of requiredEnvKeys) {
  const isSet = Boolean(envValues.get(key) || process.env[key]);
  printCheck(`${key} set`, isSet, isSet ? "set" : "missing");
  failed ||= !isSet;
}

if (failed) {
  console.error("Mac deployment check failed. Fix the failed items above.");
  process.exit(1);
}

console.log("Mac deployment check passed.");
