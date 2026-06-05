import { spawn } from "node:child_process";

export interface FfprobeMetadata {
  durationMs?: number;
  formatName?: string;
  bitRate?: number;
  codecName?: string;
}

export class FfprobeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FfprobeError";
  }
}

interface FfprobeJson {
  format?: {
    duration?: string;
    format_name?: string;
    bit_rate?: string;
  };
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
  }>;
}

function runProcess(executablePath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executablePath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const output: string[] = [];
    const errors: string[] = [];

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => errors.push(chunk));
    child.on("error", (error) => {
      reject(new FfprobeError(`FFprobe failed to start: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.join(""));
        return;
      }

      reject(new FfprobeError(`FFprobe exited with code ${code}: ${errors.join("").trim()}`));
    });
  });
}

export class FfprobeService {
  constructor(private readonly executablePath = process.env.FFPROBE_PATH ?? "ffprobe") {}

  getExecutablePath(): string {
    return this.executablePath;
  }

  async checkFfprobeAvailable(): Promise<void> {
    await runProcess(this.executablePath, ["-version"]);
  }

  async probe(inputPath: string): Promise<FfprobeMetadata> {
    const rawJson = await runProcess(this.executablePath, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      inputPath
    ]);
    const parsed = JSON.parse(rawJson) as FfprobeJson;
    const durationSeconds = parsed.format?.duration ? Number(parsed.format.duration) : undefined;
    const bitRate = parsed.format?.bit_rate ? Number(parsed.format.bit_rate) : undefined;
    const audioStream = parsed.streams?.find((stream) => stream.codec_type === "audio");

    return {
      durationMs: Number.isFinite(durationSeconds) ? Math.round((durationSeconds ?? 0) * 1000) : undefined,
      formatName: parsed.format?.format_name,
      bitRate: Number.isFinite(bitRate) ? bitRate : undefined,
      codecName: audioStream?.codec_name
    };
  }
}

export async function checkFfprobeAvailable(): Promise<void> {
  await new FfprobeService().checkFfprobeAvailable();
}

export async function probeMedia(filePath: string): Promise<FfprobeMetadata> {
  return new FfprobeService().probe(filePath);
}
