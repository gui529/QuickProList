# Campaign operations

| Doc | Purpose |
|-----|---------|
| [board.md](./board.md) | **Message log** — multi-day memory for `campaign-manager` |
| [skills/resend-api.md](./skills/resend-api.md) | **Resend API skill** — mandatory before sends |
| [skills/helper-agents.md](./skills/helper-agents.md) | How to spawn ad-hoc helper subagents |
| [skills/campaign-strategy.md](./skills/campaign-strategy.md) | Waves, pace, listed-pros-first |
| [skills/continuous-campaign.md](./skills/continuous-campaign.md) | **Never stop at Wave 1** — priority stack until subs grow |
| [skills/tracking.md](./skills/tracking.md) | **Sent registry** + prospects JSON |
| [skills/lessons.md](./skills/lessons.md) | **Lessons learned** — session memory → rules |
| [skills/unblock-yourself.md](./skills/unblock-yourself.md) | **Self-serve** — find emails, fix env, don’t idle |
| [skills/neon-mcp.md](./skills/neon-mcp.md) | **Neon MCP** — revenue, suppressions, listing sync (cloud; no `DATABASE_URL`) |
| [lessons.json](./lessons.json) | Active/superseded lessons (campaign-manager reads every run) |
| [sent-registry.json](./sent-registry.json) | Emails already sent (dedupe) |
| [prospects-registry.json](./prospects-registry.json) | Company pipeline |
| [../outreach-project.md](../outreach-project.md) | Discovery worker + admin Queue |
| [../flows/admin-campaigns-outreach.md](../flows/admin-campaigns-outreach.md) | Send tab, API, placeholders |
| [../email-deliverability.md](../email-deliverability.md) | DNS, inbox placement |

**Run the manager:** invoke `campaign-manager` (`.claude/agents/campaign-manager.md`).

**Schedule (cloud):** [skills/cloud-schedule.md](./skills/cloud-schedule.md) — Cursor Automations, e.g. every 20 min 9–6 ET.

**Local → cloud:** [skills/automation-setup.md](./skills/automation-setup.md) — cron, tick prompt, Resend + Neon MCP, unsub secret.

**Sends are off-app:** `campaign-manager-send.ts` (`--prepare` / `--finalize`) + **Resend MCP** — not Admin or `/api/campaigns/*`. See [skills/resend-api.md](./skills/resend-api.md).

**Wave 1 sync:** Neon MCP on cloud (`neon-mcp.md`); local script `campaign-sync-listed-prospects.ts` + `DATABASE_URL`.
