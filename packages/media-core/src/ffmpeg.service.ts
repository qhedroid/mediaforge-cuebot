import { spawn } from "node:child_process";

export interface FfmpegCommandOptions {
  inputPath: string;
  outputPath: string;
  args?: string[];
}

export class FfmpegError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FfmpegError";
  }
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
      reject(new FfmpegError(`FFmpeg failed to start: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.join(""));
        return;
      }

      reject(new FfmpegError(`FFmpeg exited with code ${code}: ${errors.join("").trim()}`));
    });
  });
}

export class FfmpegService {
  constructor(private readonly executablePath = process.env.FFMPEG_PATH ?? "ffmpeg") {}

  getExecutablePath(): string {
    return this.executablePath;
  }

  async checkFfmpegAvailable(): Promise<void> {
    await runProcess(this.executablePath, ["-version"]);
  }

  async run(options: FfmpegCommandOptions): Promise<void> {
    const args = [
      "-hide_banner",
      "-y",
      "-i",
      options.inputPath,
      ...(options.args ?? []),
      options.outputPath
    ];

    await runProcess(this.executablePath, args);
  }
}

export async function checkFfmpegAvailable(): Promise<void> {
  await new FfmpegService().checkFfmpegAvailable();
}
