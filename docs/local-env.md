# Local Environment

CueBot reads local development settings from `.env` in the repository root. The file is ignored by git and must stay on your machine only.

Create `.env` in the repository root from `.env.example`, then add values for these variables:

```text
DISCORD_TOKEN
DISCORD_CLIENT_ID
DISCORD_GUILD_ID
```

Never commit `.env`, Discord tokens, client secrets, provider keys, logs, or generated storage files.

The local secret check skips `.env`, `.env.local`, `.env.development`, and `.env.production` because those files are for local ignored values. It still scans committed source, docs, scripts, package files, and `.env.example`.

Before committing, run:

```powershell
pnpm secret:check
```

To validate your local CueBot settings and generate the Discord invite URL, run:

```powershell
pnpm --filter @mediaforge/cuebot setup:check
```

The setup check may print a masked token preview, but it must never print the full token.
