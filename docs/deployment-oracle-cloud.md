# Oracle Cloud Always Free Deployment

This guide runs CueBot 24/7 on an Oracle Cloud Always Free VM with systemd.

## Hosting Choice

Use an Oracle Cloud Always Free VM for the portfolio deployment. Discord bots need a long-running process, so sleeping free tiers are a poor fit.

Oracle remains useful for 24/7 bot uptime, attachment playback, direct media URLs, command testing, and non-YouTube features. YouTube playback can be blocked by cloud/datacentre IP reputation. For full CueBot functionality, especially YouTube playback, the recommended production deployment is the M4 Mac mini home server documented in [deployment-home-server-mac.md](deployment-home-server-mac.md).

Recommended VM:

- Ubuntu 22.04 or 24.04
- Ampere A1 shape if available
- Public SSH access
- A dedicated Linux user named `cuebot`

## Install Runtime Packages

```bash
ssh ubuntu@YOUR_SERVER_IP
sudo apt update
sudo apt install -y git curl ffmpeg python3 python3-pip
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

## Create the Service User

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin cuebot
sudo mkdir -p /opt/mediaforge-cuebot /etc/cuebot
sudo chown -R cuebot:cuebot /opt/mediaforge-cuebot
sudo chmod 750 /etc/cuebot
sudo -u cuebot python3 -m pip install --user -U yt-dlp
sudo -u cuebot /home/cuebot/.local/bin/yt-dlp --version
```

## Clone and Build

```bash
sudo -u cuebot git clone https://github.com/qhedroid/mediaforge-cuebot.git /opt/mediaforge-cuebot
cd /opt/mediaforge-cuebot
sudo -u cuebot corepack pnpm install --frozen-lockfile
sudo -u cuebot corepack pnpm build
sudo -u cuebot corepack pnpm secret:check
sudo -u cuebot corepack pnpm ytdlp:check
```

## Server Environment

Create `/etc/cuebot/cuebot.env` on the server only:

Required keys:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID`
- `FFMPEG_PATH` set to `/usr/bin/ffmpeg`
- `FFPROBE_PATH` set to `/usr/bin/ffprobe`
- `YTDLP_PATH` set to `/home/cuebot/.local/bin/yt-dlp`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_PLAYLIST_IMPORT_LIMIT` set to `5` for the MVP

Lock it down:

```bash
sudo chown root:cuebot /etc/cuebot/cuebot.env
sudo chmod 640 /etc/cuebot/cuebot.env
```

## systemd Service

```bash
sudo cp /opt/mediaforge-cuebot/deployment/systemd/cuebot.service /etc/systemd/system/cuebot.service
sudo systemctl daemon-reload
sudo systemctl enable cuebot
sudo systemctl start cuebot
```

The service restarts on crash, starts on reboot, and writes structured logs to journald.

## Register Commands

Run this after first deploy and after slash command changes:

```bash
cd /opt/mediaforge-cuebot
sudo -u cuebot bash -lc 'set -a; source /etc/cuebot/cuebot.env; set +a; corepack pnpm --filter @mediaforge/cuebot register'
sudo systemctl restart cuebot
```

## Logs and Health Check

```bash
journalctl -u cuebot -f -o short-iso
systemctl status cuebot
systemctl is-active cuebot
cd /opt/mediaforge-cuebot
corepack pnpm health:cuebot
```

## Update Deployment

```bash
cd /opt/mediaforge-cuebot
sudo systemctl stop cuebot
sudo -u cuebot git pull --ff-only
sudo -u cuebot corepack pnpm install --frozen-lockfile
sudo -u cuebot corepack pnpm build
sudo -u cuebot corepack pnpm secret:check
sudo -u cuebot corepack pnpm ytdlp:check
sudo systemctl start cuebot
```
