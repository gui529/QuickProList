# Email deliverability — QuickProList

Last updated: 2026-10-08.

## Current Resend status

| Domain | Status | Notes |
|--------|--------|--------|
| `contact.quickprolist.com` | **verified** | Send SPF/DKIM OK. Inbound receiving disabled (was `partially_failed` on bad MX). |
| `quickprolist.com` (apex) | **verified** | DKIM/SPF/MX/rsend records verified in Resend (2026-10-08). |

## Production env (Vercel)

- `RESEND_FROM_EMAIL` — verified address on **apex** `quickprolist.com`, e.g. `jeremy@quickprolist.com` (person-like outreach). Set `CAMPAIGN_SENDER_NAME=Jeremy` so campaigns send as `Jeremy <jeremy@quickprolist.com>`; transactional mail uses `QuickProList <jeremy@quickprolist.com>` when the env value is bare.
- `UNSUBSCRIBE_SECRET` (or `CRON_SECRET`) — required for marketing footers with one-click unsubscribe.

## Apex DNS (optional but recommended)

In Resend → Domains → `quickprolist.com`, add these at your DNS host (names only; copy values from Resend):

- TXT `resend._domainkey` (DKIM)
- MX `send` → Amazon SES feedback host (priority 10)
- TXT `send` (SPF)
- CNAME `rsend` → Resend tracking host

Then click **Verify** in Resend. Until apex is verified, keep sending from `@contact.quickprolist.com` only.

## Code / copy (done on `dev`)

- Plain marketing subjects (city + category when provided); no emoji or `$29.99/mo` in subject.
- **Person-like campaign email** in `lib/email.ts` — plain text + minimal HTML (no logo header or button CTA); set `CAMPAIGN_SENDER_NAME` for human From.
- Shorter default campaign message in `lib/campaigns.ts`.

## After DNS + env

1. Send a test campaign to your own **Outlook** inbox (e.g. Hotmail).
2. Use [mail-tester.com](https://www.mail-tester.com) once if you want a second opinion.
3. Keep volume low; cold B2B mail may still land in Junk/Other until reputation builds.
