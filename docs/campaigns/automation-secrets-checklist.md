# Automation env (optional)

Most campaign config is **in code** (`lib/campaign-defaults.ts`, `lib/campaign-owner-bcc.ts`). Full setup: **`skills/automation-setup.md`**.

| Variable | When |
|----------|------|
| `UNSUBSCRIBE_SECRET` | Only if `--prepare` cannot sign unsub links — use Vercel Production `CRON_SECRET` |

**Required (not env):** Resend MCP on the automation.
