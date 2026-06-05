import type { PrepareOptions } from "@mediaforge/shared";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { FfmpegService } from "./ffmpeg.service.js";
import { FfprobeService, type FfprobeMetadata } from "./ffprobe.service.js";

export interface ConversionRequest {
  inputPath: string;
  outputPath?: string;
  options?: PrepareOptions;
}

export interface DiscordPlayableAudio {
  preparedFilePath: string;
  converted: boolean;
  metadata: FfprobeMetadata;
}

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

function resolveOutputDirectory(outputDirectory?: string): string {
  if (outputDirectory) {
    return path.resolve(outputDirectory);
  }

  return path.join(findRepoRoot(process.cwd()), "storage", "cuebot-temp");
}

function isMp3(inputPath: string): boolean {
  return path.extname(inputPath).toLowerCase() === ".mp3";
}

export class ConversionService {
  constructor(
    private readonly ffmpegService = new FfmpegService(),
    private readonly ffprobeService = new FfprobeService()
  ) {}

  async convert(request: ConversionRequest): Promise<string> {
    const outputPath =
      request.outputPath ??
      path.join(resolveOutputDirectory(request.options?.outputDirectory), `${randomUUID()}.mp3`);

    await mkdir(path.dirname(outputPath), { recursive: true });
    await this.ffmpegService.run({
      inputPath: request.inputPath,
      outputPath,
      args: ["-vn", "-map", "0:a:0", "-codec:a", "libmp3lame", "-b:a", "192k"]
    });

    return outputPath;
  }

  async ensureDiscordPlayableAudio(
    inputPath: string,
    outputDirectory?: string
  ): Promise<DiscordPlayableAudio> {
    await this.ffmpegService.checkFfmpegAvailable();
    await this.ffprobeService.checkFfprobeAvailable();

    const inputMetadata = await this.ffprobeService.probe(inputPath);

    if (isMp3(inputPath)) {
      return {
        preparedFilePath: inputPath,
        converted: false,
        metadata: inputMetadata
      };
    }

    const resolvedOutputDirectory = resolveOutputDirectory(outputDirectory);
    const outputPath = path.join(resolvedOutputDirectory, `${randomUUID()}.mp3`);
    const preparedFilePath = await this.convert({
      inputPath,
      outputPath,
      options: { outputDirectory: resolvedOutputDirectory }
    });
    const outputMetadata = await this.ffprobeService.probe(preparedFilePath);

    return {
      preparedFilePath,
      converted: true,
      metadata: outputMetadata
    };
  }
}

export async function ensureDiscordPlayableAudio(
  inputPath: string,
  outputDirectory?: string
): Promise<DiscordPlayableAudio> {
  return new ConversionService().ensureDiscordPlayableAudio(inputPath, outputDirectory);
}
