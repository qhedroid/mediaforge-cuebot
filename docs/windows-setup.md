# Windows Setup

## Requirements

- Windows 10 or newer
- Node.js 22+
- pnpm 9+
- FFmpeg and FFprobe
- PowerShell

## Node And pnpm

Install Node.js 22 or newer from the official Node.js distribution or a Windows package manager.

Enable pnpm through Corepack:

```powershell
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

Confirm versions:

```powershell
node --version
pnpm --version
```

## FFmpeg

Install FFmpeg and make sure both `ffmpeg` and `ffprobe` are available on `PATH`.

Confirm:

```powershell
ffmpeg -version
ffprobe -version
```

If the executables are not on `PATH`, copy `.env.example` to `.env` and set:

```text
FFMPEG_PATH=C:\path\to\ffmpeg.exe
FFPROBE_PATH=C:\path\to\ffprobe.exe
```

## Project Setup

Install dependencies:

```powershell
pnpm install
```

Build:

```powershell
pnpm build
```

Do not commit `.env`, Discord tokens, provider API keys, or generated storage files.
