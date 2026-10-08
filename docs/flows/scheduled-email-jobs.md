# Flow: Scheduled email jobs (cron)

Vercel cron (see `vercel.json`) hits authenticated endpoints; businesses receive email without clicking the site.

---

## Performance digest

**Endpoint:** `GET /api/cron/digest`  
**Auth:** `Authorization: Bearer {CRON_SECRET}`  
**Logic:** `lib/digest.ts` → `sendDigestEmail` per eligible subscribed business (stats from curated row / dashboard metrics).

**User effect:** Email with lifetime stats + link to site (`lib/email.ts` `sendDigestEmail`).

---

## Win-back

**Endpoint:** `GET /api/cron/winback`  
**Auth:** same Bearer pattern  
**Logic:** `lib/winback.ts` — finds `expired-trial` reports with `contact_email`, sends marketing email with new `enrollUrl`, sets `winback_sent_at`.

**User effect:** [enroll-paid-subscription.md](./enroll-paid-subscription.md) entry via email.

---

## Key files

`app/api/cron/digest/route.ts`, `app/api/cron/winback/route.ts`, `lib/digest.ts`, `lib/winback.ts`, `vercel.json`.
