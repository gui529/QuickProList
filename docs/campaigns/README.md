# Campaign operations

| Doc | Purpose |
|-----|---------|
| [board.md](./board.md) | **Message log** — multi-day memory for `campaign-manager` |
| [skills/resend-api.md](./skills/resend-api.md) | **Resend API skill** — mandatory before sends |
| [skills/helper-agents.md](./skills/helper-agents.md) | How to spawn ad-hoc helper subagents |
| [skills/campaign-strategy.md](./skills/campaign-strategy.md) | Waves, pace, listed-pros-first |
| [skills/tracking.md](./skills/tracking.md) | **Sent registry** + prospects JSON |
| [sent-registry.json](./sent-registry.json) | Emails already sent (dedupe) |
| [prospects-registry.json](./prospects-registry.json) | Company pipeline |
| [../outreach-project.md](../outreach-project.md) | Discovery worker + admin Queue |
| [../flows/admin-campaigns-outreach.md](../flows/admin-campaigns-outreach.md) | Send tab, API, placeholders |
| [../email-deliverability.md](../email-deliverability.md) | DNS, inbox placement |

**Run the manager:** invoke `campaign-manager` (`.claude/agents/campaign-manager.md`).

**Sends are off-app:** `npx tsx scripts/campaign-manager-send.ts` + Resend env — not Admin or `/api/campaigns/*`. See [skills/resend-api.md](./skills/resend-api.md).
