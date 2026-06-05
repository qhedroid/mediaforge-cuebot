import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "node:path";

function findRepoRoot(startDirectory: string): string {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    if (existsSync(path.join(currentDirectory, "pnpm-workspace.yaml"))) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return path.resolve(startDirectory);
    }

    currentDirectory = parentDirectory;
  }
}

function isInsideDirectory(filePath: string, directoryPath: string): boolean {
  const relative = path.relative(path.resolve(directoryPath), path.resolve(filePath));
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function deleteCueBotTempFile(filePath: string): Promise<void> {
  const tempDirectory = path.join(findRepoRoot(process.cwd()), "storage", "cuebot-temp");

  if (!isInsideDirectory(filePath, tempDirectory)) {
    return;
  }

  await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
  });
}

export class CleanupService {
  async cleanTemporaryFile(filePath: string): Promise<void> {
    await deleteCueBotTempFile(filePath);
  }
}
