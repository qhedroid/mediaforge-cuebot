# M4 Mac Mini Home Server Deployment

The recommended production deployment for full CueBot functionality is the user's M4 Mac mini home server.

## Why Home Server

Oracle Cloud is useful for 24/7 uptime, command testing, attachment playback, direct media URLs, and non-YouTube features. YouTube playback can be blocked on cloud/datacentre IP ranges, as seen with the Oracle deployment.

An M4 Mac mini is a better production target for full CueBot functionality because:

- It can stay on 24/7 while the Windows PC is off.
- It uses the home/residential network instead of a cloud/datacentre IP.
- It has much more CPU/RAM headroom than the free Oracle micro VM.
- It keeps the deployment simple: one machine runs CueBot and MediaForge preparation locally.

Do not add YouTube cookies, Google login, proxies, VPN bypass, or workaround logic to the repo.

## Requirements

- macOS on the M4 Mac mini
- Homebrew
- Git
- Node.js 22+
- pnpm 9.15.4
- FFmpeg and FFprobe
- yt-dlp

## Install Homebrew

Run this in Terminal on the Mac mini:

```zsh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Apple Silicon Homebrew usually installs tools under `/opt/homebrew/bin`.

## Install Runtime Packages

```zsh
brew update
brew install git node@22 ffmpeg yt-dlp
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm --version
```

If `pnpm` is not found after Corepack, open a new Terminal window and retry.

## Clone and Build CueBot

```zsh
cd ~
git clone https://github.com/qhedroid/mediaforge-cuebot.git
cd mediaforge-cuebot
pnpm install
pnpm build
pnpm secret:check
pnpm ytdlp:check
pnpm health:cuebot
```

## Create `.env`

Create `.env` in the repository root on the Mac mini:

```zsh
cp .env.example .env
nano .env
```

Set the required Discord values and any optional paths from [production-env.md](production-env.md). Never commit `.env`.

Useful path checks:

```zsh
which pnpm
which ffmpeg
which ffprobe
which yt-dlp
```

## Register Commands

Run this after first setup and whenever slash commands change:

```zsh
pnpm --filter @mediaforge/cuebot register
```

## Start Manually

Before configuring launchd, test the bot manually:

```zsh
pnpm --filter @mediaforge/cuebot start
```

In Discord, test:

```text
/ping
/help
```

Press `Ctrl+C` in Terminal to stop the manual process before enabling launchd.

## launchd Setup

Create logs directory:

```zsh
cd ~/mediaforge-cuebot
mkdir -p logs
```

Copy the LaunchAgent template:

```zsh
mkdir -p ~/Library/LaunchAgents
cp deployment/launchd/com.qhedroid.cuebot.plist.example ~/Library/LaunchAgents/com.qhedroid.cuebot.plist
```

Edit the plist:

```zsh
nano ~/Library/LaunchAgents/com.qhedroid.cuebot.plist
```

Replace `YOUR_USER` with your macOS username.

Verify the pnpm path:

```zsh
which pnpm
```

Apple Silicon Homebrew usually uses:

```text
/opt/homebrew/bin/pnpm
```

If `which pnpm` prints a different path, update the first `ProgramArguments` entry in the plist.

Load and start CueBot:

```zsh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.qhedroid.cuebot.plist
launchctl enable gui/$(id -u)/com.qhedroid.cuebot
launchctl kickstart -k gui/$(id -u)/com.qhedroid.cuebot
```

## Start, Stop, Restart

Status:

```zsh
launchctl print gui/$(id -u)/com.qhedroid.cuebot
```

Stop:

```zsh
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.qhedroid.cuebot.plist
```

Start:

```zsh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.qhedroid.cuebot.plist
```

Restart:

```zsh
launchctl kickstart -k gui/$(id -u)/com.qhedroid.cuebot
```

## Logs

CueBot logs are written to:

```text
~/mediaforge-cuebot/logs/cuebot.out.log
~/mediaforge-cuebot/logs/cuebot.err.log
```

Follow logs:

```zsh
tail -f ~/mediaforge-cuebot/logs/cuebot.out.log
tail -f ~/mediaforge-cuebot/logs/cuebot.err.log
```

## Keep the Mac Awake

Disable sleep or configure the Mac mini to stay awake while plugged in:

```zsh
sudo pmset -a sleep 0
sudo pmset -a displaysleep 10
sudo pmset -a disksleep 0
```

You can also use macOS System Settings to prevent sleep while plugged in.

## Troubleshooting

### yt-dlp blocked or fails

Run:

```zsh
pnpm ytdlp:check
yt-dlp --version
```

If YouTube playback fails on the Mac mini, try a different legally permitted URL first. Do not add cookies, Google login, proxies, VPN bypass, or workaround logic.

### FFmpeg missing

Run:

```zsh
brew install ffmpeg
which ffmpeg
which ffprobe
```

Set `FFMPEG_PATH` and `FFPROBE_PATH` in `.env` if needed.

### Bot offline

Check:

```zsh
launchctl print gui/$(id -u)/com.qhedroid.cuebot
tail -f ~/mediaforge-cuebot/logs/cuebot.err.log
```

Also verify `.env` contains the required Discord keys.

### Slash commands stale

Run:

```zsh
pnpm --filter @mediaforge/cuebot register
launchctl kickstart -k gui/$(id -u)/com.qhedroid.cuebot
```

### Permission problems

Make sure the repo and logs belong to your macOS user:

```zsh
chown -R "$(whoami)" ~/mediaforge-cuebot
mkdir -p ~/mediaforge-cuebot/logs
```

### Mac sleeping

If CueBot goes offline when the display sleeps or the user logs out, revisit Energy settings and `pmset`. The Mac mini should be configured to stay awake while plugged in.
