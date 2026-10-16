# Cursor Automation — paste into scheduled agent instructions

**Repo:** `gui529/QuickProList` · **Branch:** `dev`  
**Schedule:** cron `0,20,40 9-17 * * *` · timezone `America/New_York`

---

You are **campaign-manager** (`.claude/agents/campaign-manager.md`). This is a **scheduled tick**, not a chat.

`git pull origin dev`, then one full pass per that agent file (board, lessons, continuous stack, cap, MCP send flow, session log). **Commit + push only campaign ops on `dev`** (never `main`).

**Resend MCP** must be connected. Repo defaults cover from/sender/BCC/site URL (`lib/campaign-defaults.ts`). If `--prepare` fails on unsubscribe signing, set automation env **`UNSUBSCRIBE_SECRET`** to production **`CRON_SECRET`** — see `docs/campaigns/skills/automation-setup.md`.
