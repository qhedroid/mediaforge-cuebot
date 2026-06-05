import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

async function loadRootDotenv() {
  const dotenvPath = path.join(process.cwd(), ".env");

  if (!existsSync(dotenvPath)) {
    return;
  }

  const text = await readFile(dotenvPath, "utf8");

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);

    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
}

function humanReadableFileSize(sizeBytes) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = sizeBytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function runProcess(executablePath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executablePath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const output = [];
    const errors = [];

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => errors.push(chunk));
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.join(""));
        return;
      }

      reject(new Error(errors.join("").trim() || `ffprobe exited with code ${code}`));
    });
  });
}

async function probeMedia(filePath) {
  const rawJson = await runProcess(process.env.FFPROBE_PATH ?? "ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath
  ]);

  return JSON.parse(rawJson);
}

const inputPath = process.argv[2];

await loadRootDotenv();

if (!inputPath) {
  console.error('Usage: node scripts/test-local-media.mjs "C:\\path\\to\\file.mp3"');
  process.exit(1);
}

const resolvedPath = path.resolve(inputPath);

if (!existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

const fileStats = await stat(resolvedPath);
const extension = path.extname(resolvedPath).toLowerCase();

console.log("Local media test");
console.log(`Filename: ${path.basename(resolvedPath)}`);
console.log(`Path: ${resolvedPath}`);
console.log(`Size: ${humanReadableFileSize(fileStats.size)}`);
console.log(`Extension: ${extension || "none"}`);

try {
  const metadata = await probeMedia(resolvedPath);
  const audioStream = metadata.streams?.find((stream) => stream.codec_type === "audio");
  const durationSeconds = metadata.format?.duration ? Number(metadata.format.duration) : undefined;

  console.log("FFprobe: available");
  console.log(`Format: ${metadata.format?.format_name ?? "unknown"}`);
  console.log(`Audio codec: ${audioStream?.codec_name ?? "unknown"}`);
  console.log(
    `Duration: ${Number.isFinite(durationSeconds) ? `${Math.round(durationSeconds * 1000)} ms` : "unknown"}`
  );
  console.log(extension === ".mp3" ? "CueBot playback path: MP3 can be used as-is." : "CueBot playback path: this file would be converted/extracted to MP3.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FFprobe: failed - ${message}`);
  console.error("Check FFmpeg/FFprobe installation or try another audio file.");
  process.exit(1);
}
