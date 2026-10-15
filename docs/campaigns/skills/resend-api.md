# Resend API skill (campaign-manager)

**Mandatory before any send.** Campaign email is **standalone** — not routed through
the Next.js app, Admin UI, or `/api/campaigns/*`. No `DATABASE_URL` required to send
(optional: Neon suppressions check if env is present).

Pair this doc with the upstream **Resend skill** (idempotency, `{ data, error }`).

## 1. Canonical Resend skill

1. `C:\Users\gui52\.cursor\plugins\cache\cursor-public\resend\4b1558df96241f0a7eb416a1ce262650f2a5f471\skills\resend\SKILL.md`
2. CLI (optional): `skills\resend-cli\SKILL.md`, `skills\resend-cli\references\emails.md`

**Do not use Resend MCP** unless the owner connects it. Use **SDK + scripts** below.

## 2. Credentials (never log or commit)

| Variable | Required to send |
|----------|------------------|
| `RESEND_API_KEY` | Yes |
| `RESEND_FROM_EMAIL` | Yes |
| `CAMPAIGN_SENDER_NAME` | Recommended (`Jeremy`) |
| `UNSUBSCRIBE_SECRET` or `CRON_SECRET` | Yes (footer + List-Unsubscribe) |
| `SITE_URL` | Yes (`https://www.quickprolist.com`) |
| `DATABASE_URL` | **No** — only for optional suppression lookup |

```powershell
cd C:\Projects\QuickProList
npx vercel env pull .env.campaign-send.local --environment=production --yes
```

`scripts/load-campaign-env.ts` loads `.env.local` then merges
`.env.campaign-send.local` (skips empty pulled secrets; keeps longer local values).

If `UNSUBSCRIBE_SECRET` is missing locally, the send script may fall back to
`QA_ADMIN_SECRET` from `.env.local` for **dev-only** sends — add production
`UNSUBSCRIBE_SECRET` to `.env.local` for unsubscribe links that match prod.

## 3. Primary send command (campaign-manager)

```powershell
npx tsx scripts/campaign-manager-send.ts `
  --to pro@example.com `
  --business "Acme Plumbing" `
  --city marietta `
  --category plumbing `
  --batch 2026-10-15-atl-hvac `
  [--enroll-url "https://www.quickprolist.com/enroll/TOKEN"]
```

- **`--dry-run`** — print subject + plain text, no API call.
- **`--enroll-url`** — optional; without it, mail links to **search** for city+category.
- **Idempotency:** `campaign/<batch>/<email>` (Resend skill).

Copy/template logic reuses shared **library** files only as text builders — no HTTP
to the running site:

| Piece | File |
|-------|------|
| Body | `lib/campaigns.ts` → `DEFAULT_MESSAGE` |
| Placeholders | `lib/campaign-message.ts` |
| Subject / HTML | `lib/email.ts` |
| Unsubscribe token | `lib/unsubscribe.ts` |

## 4. What campaign-manager does **not** use for sends

- `/admin` Campaigns tabs
- `POST /api/campaigns/send` or prospects queue APIs
- Vercel production **runtime** (only env pull for secrets)
- Recording in `campaign_contacts` (log sends on **`docs/campaigns/board.md`** instead)

The in-app campaign UI remains available to **humans**; the agent’s path is **Resend-only**.

## 5. After sending

1. Append to `docs/campaigns/board.md` (to, business, batch, Resend `id`, subject).
2. `resend emails get <id>` or Resend dashboard → `last_event`.
3. On bounce/complaint: add to board **Do not contact**; pause if needed.

## 6. Owner send authority

When `board.md` → **Send authority** is `STANDALONE` and status is `ACTIVE`,
campaign-manager may send within **Daily email cap** without per-message owner
approval. Owner can set `PAUSED` or lower the cap anytime.
