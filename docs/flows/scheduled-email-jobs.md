# Flow: Scheduled email jobs (cron)

Vercel cron (see `vercel.json`) hits authenticated endpoints; businesses receive email without clicking the site.

---

## Performance digest

**Endpoint:** `GET /api/cron/digest`  
**Auth:** `Authorization: Bearer {CRON_SECRET}`  
**Logic:** `lib/digest.ts` → `sendDigestEmail` per eligible subscribed business (stats from curated row / dashboard metrics).

**Gated:** No digests sent unless `PRO_DASHBOARD_ENABLED` is true (`lib/feature-flags.ts`).

**User effect:** Email with lifetime stats + link to site (`lib/email.ts` `sendDigestEmail`).

---

## Win-back

**Endpoint:** `GET /api/cron/winback`  
**Auth:** same Bearer pattern  
**Logic:** `lib/winback.ts` — finds `expired-trial` reports with `contact_email`, sends marketing email with new `enrollUrl`, sets `winback_sent_at`.

**User effect:** [enroll-paid-subscription.md](./enroll-paid-subscription.md) entry via email.

Details when preview lapses without payment: [trial-expiration.md](./trial-expiration.md).

---

## Trial ending soon

**Endpoint:** `GET /api/cron/trial-reminder` (daily in `vercel.json`)  
**Auth:** `Authorization: Bearer {CRON_SECRET}`  
**Logic:** `lib/trial-reminder.ts` — active `trial` status, `trial_ends_at` within `TRIAL_REMINDER_HOURS` (default 72), `contact_email` set, `trial_reminder_sent_at` null. Email includes `enroll/{token}?subscribe=1`.

Requires migration `016_invitation_contact_and_trial_reminder.sql` on Neon.

---

## Key files

`app/api/cron/digest/route.ts`, `app/api/cron/winback/route.ts`, `app/api/cron/trial-reminder/route.ts`, `lib/digest.ts`, `lib/winback.ts`, `lib/trial-reminder.ts`, `vercel.json`.
