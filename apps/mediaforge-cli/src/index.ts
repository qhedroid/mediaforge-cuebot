import { ConversionService, MetadataService } from "@mediaforge/media-core";
import {
  formatPlan,
  isCliEntryPoint,
  loadMediaForgeConfig,
  runMediaForgePipeline
} from "./pipeline.js";

export function createMediaForgeServices(): {
  conversionService: ConversionService;
  metadataService: MetadataService;
} {
  return {
    conversionService: new ConversionService(),
    metadataService: new MetadataService()
  };
}

export {
  buildCommandsForJob,
  buildMediaForgeJobs,
  createOutputPath,
  formatPlan,
  loadMediaForgeConfig,
  MediaForgeConfigError,
  MediaForgePipelineError,
  normalizeStages,
  parseMediaForgeConfig,
  planMediaForgePipeline,
  runMediaForgePipeline
} from "./pipeline.js";

function readCliArgs(args: string[]): { configPath?: string; dryRun: boolean } {
  const configIndex = args.indexOf("--config");
  const configPath = configIndex >= 0 ? args[configIndex + 1] : undefined;
  return {
    configPath,
    dryRun: args.includes("--dry-run")
  };
}

async function main(): Promise<void> {
  const { configPath, dryRun } = readCliArgs(process.argv.slice(2));

  if (!configPath) {
    console.log("Usage: mediaforge --config mediaforge.config.json --dry-run");
    return;
  }

  const config = await loadMediaForgeConfig(configPath);
  const result = await runMediaForgePipeline(config, { dryRun });
  console.log(formatPlan(result));
}

if (isCliEntryPoint(import.meta.url)) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`MediaForge failed: ${message}`);
    process.exitCode = 1;
  });
}
