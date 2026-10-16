# Cloud automation (minimal)

## Owner setup (once)

| Step | What |
|------|------|
| 1 | Cursor Automation → repo **`gui529/QuickProList`**, branch **`dev`** |
| 2 | Schedule: cron **`0,20,40 9-17 * * *`**, timezone **`America/New_York`** |
| 3 | Instructions: paste **`docs/campaigns/automation-tick-prompt.md`** |
| 4 | Enable **Resend MCP** on the automation |
| 5 | **Environment (.env paste):** run `npm run fetch:campaign-automation-env` (or `.\scripts\fetch-campaign-automation-env.ps1`), then paste **`secrets/campaign-automation-paste.env`** into the automation env UI |

Everything else (from, sender, BCC, site URL, cap, copy, send flow) lives in **repo + `campaign-manager` agent** — see `lib/campaign-defaults.ts`, `lib/campaign-owner-bcc.ts`, `board.md`.

## Agent does each tick

`git pull` → read board/lessons → work stack → `--prepare` → Resend MCP → `--finalize` → log board → commit/push `dev` campaign files.

Details: `.claude/agents/campaign-manager.md`, `resend-api.md`, `cloud-schedule.md`.
