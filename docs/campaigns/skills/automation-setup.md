# Cloud automation (minimal)

## Owner setup (once)

| Step | What |
|------|------|
| 1 | Cursor Automation → repo **`gui529/QuickProList`**, branch **`dev`** |
| 2 | Schedule: cron **`0,20,40 7-19 * * *`**, timezone **`America/New_York`** (sends **7:00–20:00** ET — see `lib/campaign-defaults.ts`) |
| 3 | Instructions: paste **`docs/campaigns/automation-tick-prompt.md`** |
| 4 | Enable **Resend MCP** on the automation |
| 5 | Enable **Neon MCP** on the automation (production QuickProList DB) — see **`neon-mcp.md`** |
| 6 | **Runtime secret** **`UNSUBSCRIBE_SECRET`** (= Vercel Production) if not already set — `secrets/campaign-automation-paste.env` via `npm run fetch:campaign-automation-env` |

Everything else (from, sender, BCC, site URL, cap, copy, send flow, **DB via Neon MCP**) lives in **repo + `campaign-manager` agent** — `lib/campaign-defaults.ts`, `neon-mcp.md`, `board.md`. **No `DATABASE_URL`** on the automation.

## Agent does each tick

`git pull` → read board/lessons → work stack → `--prepare` → Resend MCP → `--finalize` → log board → commit/push `dev` campaign files.

Details: `.claude/agents/campaign-manager.md`, `resend-api.md`, `cloud-schedule.md`.
