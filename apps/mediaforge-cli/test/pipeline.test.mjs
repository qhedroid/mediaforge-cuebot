import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCommandsForJob,
  buildMediaForgeJobs,
  createOutputPath,
  loadMediaForgeConfig,
  MediaForgeConfigError,
  MediaForgePipelineError,
  normalizeStages,
  parseMediaForgeConfig,
  runMediaForgePipeline
} from "../dist/index.js";

async function createFixtureWorkspace() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "mediaforge-test-"));
  const inputDir = path.join(workspace, "input");
  await writeFile(path.join(workspace, "placeholder"), "");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(inputDir, { recursive: true }));
  const inputPath = path.join(inputDir, "demo source.wav");
  await writeFile(inputPath, "small fake media fixture");
  return { workspace, inputDir, inputPath };
}

test("normalizes pipeline stages into executable order", () => {
  assert.deepEqual(normalizeStages(["metadata", "probe", "transcode"]), [
    "probe",
    "transcode",
    "metadata"
  ]);
});

test("parses config and rejects invalid config", () => {
  const config = parseMediaForgeConfig({
    inputDir: "input",
    outputDir: "out",
    targetFormat: "mp3",
    assets: [{ input: "clip.wav", stages: ["metadata", "probe"] }]
  });

  assert.equal(config.outputDir, "out");
  assert.equal(config.assets[0].input, "clip.wav");
  assert.throws(
    () => parseMediaForgeConfig({ outputDir: "out", assets: [{ input: "clip.wav", stages: ["ship"] }] }),
    MediaForgeConfigError
  );
});

test("loads config from JSON file", async () => {
  const { workspace } = await createFixtureWorkspace();
  const configPath = path.join(workspace, "mediaforge.config.json");
  await writeFile(
    configPath,
    JSON.stringify({ inputDir: "input", outputDir: "out", assets: [{ input: "demo source.wav" }] })
  );

  const config = await loadMediaForgeConfig(configPath);
  assert.equal(config.assets.length, 1);
  assert.equal(config.assets[0].input, "demo source.wav");
});

test("generates stable output paths", () => {
  assert.equal(
    createOutputPath("/tmp/source/raw.wav", "/tmp/output", "mp3", "ready-track"),
    path.resolve("/tmp/output/ready-track.mp3")
  );
  assert.equal(
    createOutputPath("/tmp/source/raw.wav", "/tmp/output", "opus"),
    path.resolve("/tmp/output/raw.opus")
  );
});

test("builds jobs and commands without touching large media files", async () => {
  const { workspace, inputPath } = await createFixtureWorkspace();
  const [job] = buildMediaForgeJobs(
    {
      inputDir: "input",
      outputDir: "output",
      assets: [{ input: "demo source.wav", outputName: "demo-ready" }]
    },
    workspace
  );

  assert.equal(job.inputPath, inputPath);
  assert.equal(job.outputPath, path.join(workspace, "output", "demo-ready.mp3"));
  assert.deepEqual(job.stages, ["probe", "transcode", "metadata"]);

  const commands = buildCommandsForJob(job);
  assert.equal(commands[0].executable, "ffprobe");
  assert.equal(commands[1].executable, "ffmpeg");
  assert.deepEqual(commands[1].args.slice(0, 5), ["-hide_banner", "-y", "-i", inputPath, "-vn"]);
});

test("dry-run validates inputs and returns the planned commands", async () => {
  const { workspace, inputPath } = await createFixtureWorkspace();
  const result = await runMediaForgePipeline(
    {
      inputDir: "input",
      outputDir: "output",
      assets: [{ input: "demo source.wav", stages: ["transcode", "probe"] }]
    },
    { baseDirectory: workspace, dryRun: true }
  );

  assert.equal(result.dryRun, true);
  assert.equal(result.jobs[0].inputPath, inputPath);
  assert.deepEqual(result.jobs[0].commands.map((command) => command.stage), ["probe", "transcode"]);
});

test("missing input fails before command execution", async () => {
  const { workspace } = await createFixtureWorkspace();
  await assert.rejects(
    () =>
      runMediaForgePipeline(
        { inputDir: "input", outputDir: "output", assets: [{ input: "missing.wav" }] },
        { baseDirectory: workspace, dryRun: true }
      ),
    /Input file does not exist/
  );
});

test("stage runner failures are surfaced with stage context", async () => {
  const { workspace } = await createFixtureWorkspace();
  const seenStages = [];

  await assert.rejects(
    () =>
      runMediaForgePipeline(
        { inputDir: "input", outputDir: "output", assets: [{ input: "demo source.wav" }] },
        {
          baseDirectory: workspace,
          dryRun: false,
          runner: {
            async run(command) {
              seenStages.push(command.stage);
              if (command.stage === "transcode") {
                throw new Error("ffmpeg fixture failure");
              }
            }
          }
        }
      ),
    (error) => {
      assert.ok(error instanceof MediaForgePipelineError);
      assert.equal(error.stage, "transcode");
      assert.match(error.message, /Pipeline stage failed/);
      return true;
    }
  );

  assert.deepEqual(seenStages, ["probe", "transcode"]);
});
