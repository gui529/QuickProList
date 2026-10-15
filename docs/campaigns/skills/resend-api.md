# Resend API skill (campaign-manager)

**Mandatory before any send, inbox test, or deliverability check.** This doc is
QuickProList’s runbook; pair it with the upstream **Resend skill** (gotchas,
idempotency, errors).

## 1. Read the canonical Resend skill

Read these files in order (absolute paths on owner machine):

1. `C:\Users\gui52\.cursor\plugins\cache\cursor-public\resend\4b1558df96241f0a7eb416a1ce262650f2a5f471\skills\resend\SKILL.md`
2. If using CLI: same folder → `skills\resend-cli\SKILL.md` and
   `skills\resend-cli\references\emails.md`

**Do not use Resend MCP** unless the owner explicitly connects it. Prefer **SDK
or CLI + this repo’s scripts** so keys stay in env files, not chat.

### Non‑negotiables from Resend skill

- SDK returns `{ data, error }` — always check `error`.
- Use **idempotency keys** on every send:
  `campaign/<batch-id>/<recipient-email-normalized>`.
- **From** domain must match a **verified** Resend domain (production:
  `jeremy@quickprolist.com` or whatever `RESEND_FROM_EMAIL` is).
- Never blast fake addresses at Gmail/Outlook for tests; owner tests use real
  addresses they control (e.g. Hotmail inbox test).

## 2. Credentials (never log or commit)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | API auth |
| `RESEND_FROM_EMAIL` | From line (bare; app adds `CAMPAIGN_SENDER_NAME`) |
| `CAMPAIGN_SENDER_NAME` | e.g. `Jeremy` |
| `UNSUBSCRIBE_SECRET` | Marketing footer + List-Unsubscribe (or `CRON_SECRET`) |
| `SITE_URL` | `https://www.quickprolist.com` |

**Local / agent send:**

```powershell
cd C:\Projects\QuickProList
npx vercel env pull .env.campaign-send.local --environment=production --yes
npx tsx scripts/send-campaign-preview-once.ts <to> "<Business Name>"
```

Script loads `.env.local` then **overrides** with `.env.campaign-send.local`
for production sends. `.env*` is gitignored.

Windows User env may also hold `RESEND_API_KEY` — scripts do not print values.

## 3. QuickProList message shape

Match production campaign mail:

| Piece | Source |
|-------|--------|
| Body template | `lib/campaigns.ts` → `DEFAULT_MESSAGE` |
| Placeholders | `lib/campaign-message.ts` → `expandCampaignMessage` |
| Subject | `lib/email.ts` → `buildMarketingEmailSubject` |
| HTML/text | `lib/email.ts` → `buildPersonalMarketingEmail` |
| Unsubscribe | `lib/unsubscribe.ts` → `buildUnsubscribeUrl` |

**Required for email sends:** `city` + `category` so enroll/search links work.

**Production pipeline (logged in DB):** Admin Queue or `POST /api/campaigns/send`
(session auth) — prefer for real batches after owner approval.

**Owner test / preview:** `scripts/send-campaign-preview-once.ts` (Resend API
direct, same copy as prod).

## 4. After sending

- Log on `docs/campaigns/board.md` (to, subject wedge, Resend `id`, batch).
- Check Resend dashboard or `resend emails get <id>` (CLI) for `last_event`.
- If bounces/complaints, pause campaign on board and investigate suppressions
  (`lib/suppressions.ts`, Resend suppressions).

## 5. Optional CLI examples

```bash
resend emails send --from "Jeremy <jeremy@quickprolist.com>" --to user@example.com \
  --subject "..." --text-file ./body.txt --idempotency-key "campaign/test/1"
```

Use CLI only when it matches the same compliance footers as `lib/email.ts`; when
in doubt, use the TypeScript script so unsubscribe headers stay correct.
