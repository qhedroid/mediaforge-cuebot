/**
 * check-ytdlp.mjs
 *
 * Verifies that yt-dlp is available. Respects YTDLP_PATH if set in the
 * environment. Run via: pnpm ytdlp:check
 *
 * This is a developer setup helper. It does not download anything.
 */

import { spawn } from "node:child_process";
import process from "node:process";

const executable = process.env.YTDLP_PATH ?? "yt-dlp";

console.log("yt-dlp availability check");
console.log(`Executable: ${executable}`);

function runVersionCheck(exec) {
  return new Promise((resolve, reject) => {
    const child = spawn(exec, ["--version"], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });

    const output = [];
    const errors = [];

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => errors.push(chunk));

    child.on("error", (error) => {
      reject(new Error(`yt-dlp failed to start: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.join("").trim());
      } else {
        reject(new Error(`yt-dlp exited with code ${code}: ${errors.join("").trim()}`));
      }
    });
  });
}

try {
  const version = await runVersionCheck(executable);
  console.log(`yt-dlp found: version=${version}`);
  console.log("yt-dlp check passed.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("ENOENT") || message.includes("failed to start")) {
    console.error(
      "yt-dlp could not be found. Install yt-dlp or set YTDLP_PATH in your root .env."
    );
    console.error("Install docs: https://github.com/yt-dlp/yt-dlp#installation");
  } else {
    console.error(`yt-dlp check failed: ${message}`);
  }

  process.exit(1);
}
