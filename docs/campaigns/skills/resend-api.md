# Resend skill (campaign-manager)

**Cold outreach must NOT go through Resend** (owner voice 2026-10-17 ~17:47 ET). Resend’s Acceptable Use Policy prohibits cold outreach and scraped lists. The campaign board is **PAUSED**. Do not resume sending. Do not call Resend send for prospect mail.

The planned test is ~20 emails over a few days, cap **5** on `board.md`, prepared in
`docs/campaigns/gmail-test-batch.json` and sent manually by the owner's assistant from
**gui.quickprolist@gmail.com** through the Gmail API, outside this repo. Record
each send with `scripts/campaign-check-sent.ts --record` after it has already happened. Check first:

```bash
npx tsx scripts/campaign-check-sent.ts --email=pro@example.com --business "Acme Plumbing"
```

**Resend stays for transactional / opted-in mail only.** Do not run `--prepare` → Resend MCP → `--finalize` for prospect outreach. `scripts/campaign-manager-send.ts` refuses `--prepare` and `--finalize` and does not emit a Resend payload. `--dry-run` previews copy only (no MCP, no registry write).

Send-ready Gmail mail still has to pass `lib/campaign-prepare.ts` before it is treated as ready: one `/enroll/<token>` preview link (do not substitute a search URL), recipient MX, a clear suppression check, bounce-rate pause (5% of recent known statuses), and a real `CAMPAIGN_POSTAL_ADDRESS`. Those checks do not call Resend.

Campaign email is **standalone** — not Admin or `/api/campaigns/*`. `sent-registry.json` is updated by `scripts/campaign-check-sent.ts --record` after a Gmail send that already happened, not by `--finalize`.

The steps below are the retired cold-outreach path. They are not the current send path. Running them exits with an error and does not send.

Pair with the upstream **Resend skill** (idempotency, `{ data, error }`).

## 1. Upstream skill

`C:\Users\gui52\.cursor\plugins\cache\cursor-public\resend\4b1558df96241f0a7eb416a1ce262650f2a5f471\skills\resend\SKILL.md`

Do **not** connect Resend MCP to send cold outreach. The notes below are the retired path. Resend MCP stays available only for transactional / opted-in product mail.

## 2. Retired Resend path (do not run)

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

- **`--dry-run`** — preview text only (no MCP, no registry). This is the only flag the script still runs.
- **`--prepare` / `--finalize`** — refused. They do not build a Resend payload and do not write `sent-registry.json`.
- **`--wave listed`** — Wave 1 on-site pros (`LISTED_MESSAGE`), preview only.
- **`--force`** — override dedupe on a preview (note why on board). Do not use it to send.

| Piece | File |
|-------|------|
| Body | `lib/campaigns.ts` |
| Placeholders | `lib/campaign-message.ts` |
| Subject / HTML | `lib/email.ts` |
| Unsubscribe | `lib/unsubscribe.ts` |

## 5. Owner BCC

Prepare JSON always includes **`bcc`** → `getCampaignOwnerBccEmail()`.

## 6. After a Gmail send that already happened

1. `scripts/campaign-check-sent.ts --record` so `sent-registry.json` dedupes that address.
2. **`board.md`** session log + sent mirror.
3. Bounce/complaint → **Do not contact**; keep the board **PAUSED**.

The old Resend dashboard check applied only to the retired path above. Do not send through Resend to obtain a delivery status.

## 7. Send authority

Board **Status** is `PAUSED` (2026-10-17). Do not send. Cold outreach is manual Gmail, not this skill. Owner may keep the pause in place.
