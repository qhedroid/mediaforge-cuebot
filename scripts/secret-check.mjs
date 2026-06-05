import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const skippedDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  path.join("storage", "cuebot-temp"),
  path.join("storage", "mediaforge-output")
]);
const skippedFiles = new Set(["pnpm-lock.yaml"]);
const skippedEnvFiles = new Set([".env", ".env.local", ".env.development", ".env.production"]);
const tokenAssignmentName = "DISCORD_" + "TOKEN";
const tokenAssignmentPattern = new RegExp(`\\b${tokenAssignmentName}\\s*=`);
const discordBotTokenPattern = /\b(?:mfa\.[\w-]{20,}|[A-Za-z\d_-]{23,28}\.[A-Za-z\d_-]{6,7}\.[A-Za-z\d_-]{27,})\b/g;
const findings = [];

function toRepoPath(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function shouldSkipDirectory(directoryPath) {
  const repoPath = toRepoPath(directoryPath);
  return skippedDirectories.has(repoPath) || skippedDirectories.has(path.basename(directoryPath));
}

function shouldSkipFile(filePath) {
  const repoPath = toRepoPath(filePath);
  return skippedFiles.has(repoPath) || skippedEnvFiles.has(repoPath);
}

async function collectFiles(directoryPath) {
  if (shouldSkipDirectory(directoryPath)) {
    return [];
  }

  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
    } else if (entry.isFile() && !shouldSkipFile(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

function addFinding(filePath, lineNumber, reason) {
  findings.push({
    filePath: toRepoPath(filePath),
    lineNumber,
    reason
  });
}

function scanText(filePath, text) {
  const repoPath = toRepoPath(filePath);
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (repoPath !== ".env.example" && tokenAssignmentPattern.test(line)) {
      addFinding(filePath, lineNumber, "environment token assignment");
    }

    discordBotTokenPattern.lastIndex = 0;
    if (discordBotTokenPattern.test(line)) {
      addFinding(filePath, lineNumber, "likely Discord token");
    }
  });
}

const files = await collectFiles(root);

for (const filePath of files) {
  try {
    const text = await readFile(filePath, "utf8");
    scanText(filePath, text);
  } catch {
    // Binary or unreadable files are ignored by this lightweight local check.
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found. Values are intentionally hidden.");

  for (const finding of findings) {
    console.error(`${finding.filePath}:${finding.lineNumber} ${finding.reason}`);
  }

  process.exit(1);
}

console.log("Secret check passed. No suspicious Discord secrets found.");
