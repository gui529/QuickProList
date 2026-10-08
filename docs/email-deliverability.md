# Email deliverability — QuickProList

Last updated: 2026-10-08.

## Current Resend status

| Domain | Status | Notes |
|--------|--------|--------|
| `contact.quickprolist.com` | **verified** | Send SPF/DKIM OK. Inbound receiving disabled (was `partially_failed` on bad MX). |
| `quickprolist.com` (apex) | **not_started** | Publish Resend DNS records at your registrar (see below). |

## Production env (Vercel)

- `RESEND_FROM_EMAIL` — use a clean address on the **verified** subdomain, e.g. `hello@contact.quickprolist.com` (not `contact@contact.quickprolist.com`). Code adds display name `QuickProList <…>` automatically when the env value is a bare address.
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
- Softer HTML (no big promo pricing card).
- Shorter default campaign message in `lib/campaigns.ts`.

## After DNS + env

1. Send a test campaign to your own Gmail and Outlook.
2. Use [mail-tester.com](https://www.mail-tester.com) once.
3. Keep volume low; cold B2B mail may still land in Promotions/Junk until reputation builds.
