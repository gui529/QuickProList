# Production launch — QuickProList

**Fully live:** **2026-10-15 16:59:28** Eastern (`America/New_York`, UTC−04:00)

| | |
|--|--|
| **Public site** | https://www.quickprolist.com |
| **Vercel project** | `home-help` (production deploys from `main`) |
| **Launch git ref** | First commit on `main` titled *Document production launch (2026-10-15 16:59:28 ET).* |

## What “fully prod” means here

- **Consumer product:** Search, curated listings, apply-to-list, Privacy/Terms, footer legal links.
- **Business enroll:** Live Stripe checkout on production `SITE_URL`; Neon Postgres + Cloudflare R2 for listings/photos.
- **Admin:** Google OAuth allow-list at `/admin` (campaigns, curated pros, invitations).
- **Email:** Resend on production; `UNSUBSCRIBE_SECRET` + `RESEND_WEBHOOK_SECRET` configured.
- **Crons:** `CRON_SECRET` set — Vercel hits `/api/cron/digest`, `/api/cron/winback`, `/api/cron/trial-reminder` (see [scheduled-email-jobs.md](./flows/scheduled-email-jobs.md)).
- **Intentionally off:** Pro performance dashboard (`PRO_DASHBOARD_ENABLED=false`) — no `/dashboard/[token]` for pros; digest cron is a no-op.

## Env checklist (production)

Documented in [stripe-production-setup.md](./stripe-production-setup.md) and [README.md](../README.md#environment-variables). Core: `DATABASE_URL`, R2, Auth.js Google, live Stripe + webhook, `SITE_URL`, Resend, `UNSUBSCRIBE_SECRET`, `CRON_SECRET`.

## After launch (not blockers)

- Stripe Customer Portal for self-serve billing (see [pickup-tomorrow.md](./pickup-tomorrow.md)).
- Apex domain DNS for Resend if you want mail from `@quickprolist.com` on the root domain.
- Campaign outreach secrets / Twilio only if you use those features.

## Dev workflow

Day-to-day work stays on **`dev`**; promote to **`main`** when you want production to update. This file marks the first intentional “we are live” moment.
