# Flow: Trial preview ends (self-serve enroll)

What happens when a business’s **30-day preview** from [enroll-paid-subscription.md](./enroll-paid-subscription.md) (`POST /api/enroll/start-trial`) reaches `trial_ends_at` without paying.

Admin-started trials ([admin-invitations-and-trials.md](./admin-invitations-and-trials.md)) use the same `curated_businesses.trial_ends_at` / search rules; win-back email applies the same way when status is `expired-trial`.

---

## At expiry (automatic, no cron required)

| Effect | Mechanism |
|--------|-----------|
| **Hidden from homeowner search** | `lib/kv.ts` `fetchActiveRows` only returns rows where `trial_ends_at IS NULL OR trial_ends_at > now()`. Expired trials stop appearing in `getMergedResults` / [homeowner-search.md](./homeowner-search.md). |
| **Row kept in database** | Listing is not deleted; admin still sees the business on **Pinned Pros** with derived status **expired-trial** (`lib/reports.ts` `deriveStatus`). |
| **No on-site notice to the pro** | Homepage does not show “your trial ended”; the business simply drops out of search results. |

`deriveStatus` treats a business as **`expired-trial`** when `is_trial` is true and `trial_ends_at` is in the past, or when a linked invitation has `status: 'trial'` and `trial_ends_at` has passed (`lib/reports.ts`).

Preview length defaults to **30 days** (`ENROLL_PREVIEW_TRIAL_DAYS`, set in `lib/enrollment-trial.ts`).

---

## After expiry (scheduled email — if configured)

**Endpoint:** `GET /api/cron/winback` (see [scheduled-email-jobs.md](./scheduled-email-jobs.md))

**Logic:** `lib/winback.ts` → `sendWinbackEmails`

1. Find reports with `current_status === 'expired-trial'`, `contact_email` set, and `winback_sent_at IS NULL`.
2. Skip suppressed addresses (still sets `winback_sent_at` so the job does not retry forever).
3. `createInvitation` (new pending enroll token, links existing `curated_business_id`).
4. Marketing `sendEmail` with stats from the trial + `enrollUrl` → business can enter [enroll-paid-subscription.md](./enroll-paid-subscription.md) checkout or start a **new** preview only if product allows (today: new invite is for paid path; preview is for pending invites).

5. Set `winback_sent_at` on the curated row.

**Requires:** Vercel cron + `CRON_SECRET`, Resend + `UNSUBSCRIBE_SECRET`, and usually **`contact_email`** on the curated row (often from Stripe checkout; self-serve preview alone may not collect email — win-back may not run for those businesses until email exists).

**Not built yet:** proactive “trial ending in 3 days” email (GitHub #98). Expiry is silent until win-back cron (or admin outreach).

---

## How a business stays listed after preview

| Path | Doc |
|------|-----|
| Pay via Stripe from a **pending** enroll link | [enroll-paid-subscription.md](./enroll-paid-subscription.md) → [stripe-webhook-effects.md](./stripe-webhook-effects.md) |
| Win-back email → new enroll link | This doc + enroll flow |
| Admin **Enrollment link** or **Start trial** again | [admin-invitations-and-trials.md](./admin-invitations-and-trials.md) |

**During an active preview:** `/enroll/[token]` redirects to the homepage unless `?subscribe=1` is present (checkout step). Trial-ending reminder email (~72h before end, `GET /api/cron/trial-reminder`) links to `?subscribe=1`.

**After expiry on this device:** If the pro started preview from this browser, the homepage may show an amber banner (`/api/listing-status/[id]` + `localStorage` `quickprolist:myListing`) with a checkout link when a pending/trial token exists.

**No second free preview:** `POST /api/enroll/start-trial` rejects invites that already have `curated_business_id` (win-back) or a prior `expired-trial` for the same business name.

**Paid conversion:** Stripe `checkout.session.completed` calls `clearCuratedTrial` so paid listings are not hidden when `trial_ends_at` passes.

---

## Key files

`lib/kv.ts` (search eligibility), `lib/reports.ts` (`deriveStatus`, `getBusinessReports`), `lib/winback.ts`, `app/api/cron/winback/route.ts`, `lib/enrollment-trial.ts`, `lib/invitations.ts`.
