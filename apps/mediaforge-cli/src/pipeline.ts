import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type MediaForgeStage = "probe" | "transcode" | "metadata";

export interface MediaForgeAssetConfig {
  input: string;
  outputName?: string;
  stages?: MediaForgeStage[];
}

export interface MediaForgePipelineConfig {
  inputDir?: string;
  outputDir: string;
  targetFormat?: "mp3" | "wav" | "opus";
  assets: MediaForgeAssetConfig[];
}

export interface MediaForgeJob {
  inputPath: string;
  outputPath: string;
  metadataPath: string;
  targetFormat: "mp3" | "wav" | "opus";
  stages: MediaForgeStage[];
}

export interface MediaForgeCommand {
  stage: MediaForgeStage;
  executable: "ffprobe" | "ffmpeg" | "node";
  args: string[];
}

export interface MediaForgePipelinePlan {
  jobs: Array<MediaForgeJob & { commands: MediaForgeCommand[] }>;
}

export interface MediaForgePipelineResult {
  dryRun: boolean;
  jobs: Array<{
    inputPath: string;
    outputPath: string;
    commands: MediaForgeCommand[];
  }>;
}

export interface CommandRunner {
  run(command: MediaForgeCommand, job: MediaForgeJob): Promise<void>;
}

export class MediaForgeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaForgeConfigError";
  }
}

export class MediaForgePipelineError extends Error {
  constructor(
    message: string,
    readonly stage?: MediaForgeStage,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "MediaForgePipelineError";
  }
}

const stageOrder: MediaForgeStage[] = ["probe", "transcode", "metadata"];
const supportedFormats = new Set(["mp3", "wav", "opus"]);
const supportedStages = new Set(stageOrder);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStage(value: unknown): MediaForgeStage {
  if (typeof value !== "string" || !supportedStages.has(value as MediaForgeStage)) {
    throw new MediaForgeConfigError(`Unsupported pipeline stage: ${String(value)}`);
  }

  return value as MediaForgeStage;
}

function parseTargetFormat(value: unknown): "mp3" | "wav" | "opus" {
  if (value === undefined) {
    return "mp3";
  }

  if (typeof value !== "string" || !supportedFormats.has(value)) {
    throw new MediaForgeConfigError("targetFormat must be one of: mp3, wav, opus.");
  }

  return value as "mp3" | "wav" | "opus";
}

export function normalizeStages(stages: MediaForgeStage[] = stageOrder): MediaForgeStage[] {
  const requestedStages = new Set(stages);
  return stageOrder.filter((stage) => requestedStages.has(stage));
}

export function parseMediaForgeConfig(input: unknown): MediaForgePipelineConfig {
  if (!isRecord(input)) {
    throw new MediaForgeConfigError("MediaForge config must be a JSON object.");
  }

  if (typeof input.outputDir !== "string" || !input.outputDir.trim()) {
    throw new MediaForgeConfigError("MediaForge config requires a non-empty outputDir.");
  }

  if (input.inputDir !== undefined && typeof input.inputDir !== "string") {
    throw new MediaForgeConfigError("inputDir must be a string when provided.");
  }

  if (!Array.isArray(input.assets) || input.assets.length === 0) {
    throw new MediaForgeConfigError("MediaForge config requires at least one asset.");
  }

  const targetFormat = parseTargetFormat(input.targetFormat);
  const assets = input.assets.map((asset, index): MediaForgeAssetConfig => {
    if (!isRecord(asset)) {
      throw new MediaForgeConfigError(`Asset ${index + 1} must be a JSON object.`);
    }

    if (typeof asset.input !== "string" || !asset.input.trim()) {
      throw new MediaForgeConfigError(`Asset ${index + 1} requires a non-empty input path.`);
    }

    if (asset.outputName !== undefined && typeof asset.outputName !== "string") {
      throw new MediaForgeConfigError(`Asset ${index + 1} outputName must be a string.`);
    }

    const stages = asset.stages === undefined
      ? undefined
      : Array.isArray(asset.stages)
        ? asset.stages.map(parseStage)
        : (() => {
            throw new MediaForgeConfigError(`Asset ${index + 1} stages must be an array.`);
          })();

    return {
      input: asset.input,
      outputName: asset.outputName,
      stages
    };
  });

  return {
    inputDir: input.inputDir,
    outputDir: input.outputDir,
    targetFormat,
    assets
  };
}

export async function loadMediaForgeConfig(configPath: string): Promise<MediaForgePipelineConfig> {
  const configText = await readFile(configPath, "utf8");
  return parseMediaForgeConfig(JSON.parse(configText));
}

export function createOutputPath(
  inputPath: string,
  outputDirectory: string,
  targetFormat: "mp3" | "wav" | "opus",
  outputName?: string
): string {
  const baseName = outputName?.trim() || path.parse(inputPath).name;
  const extension = targetFormat === "opus" ? ".opus" : `.${targetFormat}`;
  return path.resolve(outputDirectory, `${baseName}${extension}`);
}

export function buildMediaForgeJobs(
  config: MediaForgePipelineConfig,
  baseDirectory = process.cwd()
): MediaForgeJob[] {
  const inputDirectory = path.resolve(baseDirectory, config.inputDir ?? ".");
  const outputDirectory = path.resolve(baseDirectory, config.outputDir);
  const targetFormat = config.targetFormat ?? "mp3";

  return config.assets.map((asset) => {
    const inputPath = path.resolve(inputDirectory, asset.input);
    const outputPath = createOutputPath(inputPath, outputDirectory, targetFormat, asset.outputName);

    return {
      inputPath,
      outputPath,
      metadataPath: `${outputPath}.json`,
      targetFormat,
      stages: normalizeStages(asset.stages)
    };
  });
}

export function buildCommandsForJob(job: MediaForgeJob): MediaForgeCommand[] {
  return job.stages.map((stage) => {
    switch (stage) {
      case "probe":
        return {
          stage,
          executable: "ffprobe",
          args: ["-v", "error", "-show_format", "-show_streams", job.inputPath]
        };
      case "transcode":
        return {
          stage,
          executable: "ffmpeg",
          args: ["-hide_banner", "-y", "-i", job.inputPath, "-vn", job.outputPath]
        };
      case "metadata":
        return {
          stage,
          executable: "node",
          args: [
            "-e",
            `console.log(JSON.stringify({input:${JSON.stringify(job.inputPath)},output:${JSON.stringify(job.outputPath)}}))`
          ]
        };
    }
  });
}

export function planMediaForgePipeline(config: MediaForgePipelineConfig, baseDirectory = process.cwd()): MediaForgePipelinePlan {
  const jobs = buildMediaForgeJobs(config, baseDirectory).map((job) => ({
    ...job,
    commands: buildCommandsForJob(job)
  }));

  return { jobs };
}

export async function runMediaForgePipeline(
  config: MediaForgePipelineConfig,
  options: { baseDirectory?: string; dryRun?: boolean; runner?: CommandRunner } = {}
): Promise<MediaForgePipelineResult> {
  const plan = planMediaForgePipeline(config, options.baseDirectory);

  for (const job of plan.jobs) {
    if (!existsSync(job.inputPath)) {
      throw new MediaForgePipelineError(`Input file does not exist: ${job.inputPath}`);
    }

    if (options.dryRun) {
      continue;
    }

    if (!options.runner) {
      throw new MediaForgePipelineError("A command runner is required when dryRun is false.");
    }

    for (const command of job.commands) {
      try {
        await options.runner.run(command, job);
      } catch (error) {
        throw new MediaForgePipelineError(
          `Pipeline stage failed: ${command.stage} for ${job.inputPath}`,
          command.stage,
          error
        );
      }
    }
  }

  return {
    dryRun: options.dryRun ?? false,
    jobs: plan.jobs.map((job) => ({
      inputPath: job.inputPath,
      outputPath: job.outputPath,
      commands: job.commands
    }))
  };
}

export function formatPlan(result: MediaForgePipelineResult): string {
  const lines = [`MediaForge ${result.dryRun ? "dry-run" : "run"} plan: ${result.jobs.length} job(s)`];

  for (const job of result.jobs) {
    lines.push(`- ${path.basename(job.inputPath)} -> ${job.outputPath}`);
    for (const command of job.commands) {
      lines.push(`  ${command.stage}: ${command.executable} ${command.args.join(" ")}`);
    }
  }

  return lines.join("\n");
}

export function isCliEntryPoint(importMetaUrl: string): boolean {
  return process.argv[1] ? importMetaUrl === pathToFileURL(process.argv[1]).href : false;
}
