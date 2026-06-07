import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const repoRoot = process.cwd();
const entryPoint = path.join(repoRoot, "apps", "cuebot", "dist", "index.js");

if (!existsSync(entryPoint)) {
  console.error("CueBot health check failed: apps/cuebot/dist/index.js is missing. Run pnpm build.");
  process.exit(1);
}

if (process.platform === "linux") {
  const result = spawnSync("systemctl", ["is-active", "--quiet", "cuebot"], {
    stdio: "ignore"
  });

  if (result.status === 0) {
    console.log("CueBot health check passed: systemd service is active.");
    process.exit(0);
  }

  console.error("CueBot health check failed: systemd service cuebot is not active.");
  process.exit(1);
}

console.log("CueBot health check passed: build output exists. On Linux, this also checks systemd.");
