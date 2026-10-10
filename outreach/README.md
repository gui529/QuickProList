# QuickProList Outreach

**Separate discovery worker** in the QuickProList repo — not deployed. It finds pros and **writes to Neon** via the live API.

**Approve and send** happen in the deployed app: **Admin → Campaigns → Queue**.

Run `migrations/019_campaign_prospects.sql` on your database before using the queue.

## Setup

```bash
cd outreach
npm install
cp .env.example .env   # optional outreach-only overrides
```

Env is loaded from **repo root `.env.local`** first (shared with the Next app), then `outreach/.env`. See `.env.example`.

**Find pros (default)** runs the [Cursor CLI](https://cursor.com/docs/cli/headless) in headless print mode (`agent -p --trust --output-format json`) from the `outreach/` workspace (not the Next.js app root — that confuses the agent). Web access needs `WebFetch(*)` in `outreach/.cursor/cli.json` and/or `~/.cursor/cli-config.json`. Install the CLI, run `agent login` once (or set `CURSOR_API_KEY`), then use the dashboard or `npm run find`.

If the CLI cannot search the web, the dashboard shows a warning. With `SERPER_API_KEY` set, it automatically falls back to Serper (disable with `OUTREACH_DISCOVERY_FALLBACK=none`).

To use Serper instead, set `OUTREACH_DISCOVERY=serper` and `SERPER_API_KEY` (optional `OPENAI_API_KEY` for extraction).

For sending, set `OUTREACH_API_URL` or `SITE_URL`, and `CAMPAIGN_OUTREACH_SECRET` (must match Vercel).

## Dashboard

```bash
npm run dashboard
```

Open **http://127.0.0.1:3847** (localhost only).

## CLI

```bash
npm run find -- --city "Marietta, GA" --category plumbing
```

## Sync with the app

When you add towns or trades in the main app, update:

- `outreach/src/open-towns.ts` (mirror `lib/open-towns.ts`)
- `outreach/src/categories.ts` (mirror `lib/categories.ts`)

