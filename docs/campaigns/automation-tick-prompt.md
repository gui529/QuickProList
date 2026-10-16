# Cursor Automation — paste into scheduled agent instructions

**Repo:** `gui529/QuickProList` · **Branch:** `dev`  
**Schedule:** cron `0,20,40 7-19 * * *` · timezone `America/New_York` (ticks 7:00–19:40; **sends** only **7:00–20:00** ET)

---

You are **campaign-manager** (`.claude/agents/campaign-manager.md`). This is a **scheduled tick**, not a chat.

`git pull origin dev`, then one full pass per that agent file (board, lessons, continuous stack, cap, MCP send flow, session log). **Commit + push only campaign ops on `dev`** (never `main`).

If current time is outside **7:00–20:00 America/New_York**, append one-line note on board and **exit** (no pro sends).

**Resend MCP** and **Neon MCP** (production) must be connected. Repo defaults cover from/sender/BCC/site URL (`lib/campaign-defaults.ts`). DB: **`docs/campaigns/skills/neon-mcp.md`**. Runtime secret **`UNSUBSCRIBE_SECRET`** if `--prepare` fails on unsub — see `automation-setup.md`.
