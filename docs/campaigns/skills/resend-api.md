# Resend skill (campaign-manager)

**Mandatory before any send.** Campaign email is **standalone** — not Admin or
`/api/campaigns/*`. Delivery is **Resend MCP only** (owner policy). This script
builds mail and updates **`sent-registry.json`**; MCP sends it.

Pair with the upstream **Resend skill** (idempotency, `{ data, error }`).

## 1. Upstream skill

`C:\Users\gui52\.cursor\plugins\cache\cursor-public\resend\4b1558df96241f0a7eb416a1ce262650f2a5f471\skills\resend\SKILL.md`

Connect **Resend MCP** on the agent (cloud automation or local session).

## 2. Every send (three steps)

**1. Prepare** — copy, BCC, unsubscribe, dedupe check:

```powershell
npx tsx scripts/campaign-manager-send.ts `
  --to pro@example.com `
  --business "Acme Plumbing" `
  --city marietta `
  --category plumbing `
  --batch 2026-10-15-atl-hvac `
  --wave listed `
  --prepare
```

Stdout JSON: `resend` payload, `idempotencyKey`, `registry` metadata.

**2. Resend MCP** — send using that payload; pass **`idempotencyKey`** when the tool allows.

**3. Finalize** — write the notebook after MCP returns an email id:

```powershell
npx tsx scripts/campaign-manager-send.ts `
  --to pro@example.com `
  --business "Acme Plumbing" `
  --city marietta `
  --category plumbing `
  --batch 2026-10-15-atl-hvac `
  --wave listed `
  --finalize --resend-id <id-from-mcp>
```

Skipping **finalize** means **`sent-registry.json` is not updated** → dedupe breaks.

## 3. Env (minimal)

**In code (`lib/campaign-defaults.ts`, `lib/campaign-owner-bcc.ts`):** site URL, from, sender, BCC.

| Variable | When |
|----------|------|
| `UNSUBSCRIBE_SECRET` or `CRON_SECRET` | Unsub link signing — set on automation if not inherited; must match Vercel prod |
| Suppressions / revenue / listing sync | **Neon MCP** on cloud ticks (`neon-mcp.md`); local may use `DATABASE_URL` + scripts |

Local agent runs may use `.env.local` via `load-campaign-env.ts`.

## 4. Flags

- **`--dry-run`** — preview text only (no MCP, no registry).
- **`--wave listed`** — Wave 1 on-site pros (`LISTED_MESSAGE`).
- **`--force`** — override dedupe (note why on board).

| Piece | File |
|-------|------|
| Body | `lib/campaigns.ts` |
| Placeholders | `lib/campaign-message.ts` |
| Subject / HTML | `lib/email.ts` |
| Unsubscribe | `lib/unsubscribe.ts` |

## 5. Owner BCC

Prepare JSON always includes **`bcc`** → `getCampaignOwnerBccEmail()`.

## 6. After sending

1. **`board.md`** session log + sent mirror.
2. Resend MCP or dashboard for delivery status.
3. Bounce/complaint → **Do not contact**; pause if needed.

## 7. Send authority

`STANDALONE` + `ACTIVE` → send within daily cap. Owner may `PAUSE` anytime.
