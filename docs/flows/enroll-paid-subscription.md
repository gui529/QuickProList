# Flow: Enrollment (invitation → preview → 30-day trial or Stripe)

Business receives `/enroll/[token]` (from campaign email, win-back email, or an admin-copied link), previews a mock listing, then either **starts a 30-day preview** (no card; listing goes live) or **subscribes immediately** via Stripe Checkout.

Admin **trials** are a different flow: [admin-invitations-and-trials.md](./admin-invitations-and-trials.md).

Webhook side effects: [stripe-webhook-effects.md](./stripe-webhook-effects.md).

---

## Preconditions

- Row in `enrollment_invitations` with `status: 'pending'` (default `expires_at` = created + 30 days per `migrations/001_add_enrollment_invitations.sql`).
- Token in URL matches `enrollment_invitations.token`.

---

## How the invitation is created

| Source | Code |
|--------|------|
| Campaign email | `POST /api/campaigns/send` → `createInvitation` → `enrollUrl` in `sendEmail` |
| Win-back cron | `lib/winback.ts` → `createInvitation` + `sendEmail` with `enrollUrl` |
| Admin modal | `POST /api/invitations` (no `isTrial`) → returns `{ token }` |

Campaign email **requires** `city` and `category` on the send payload (`app/api/campaigns/send/route.ts`).

---

## Steps (user-visible)

### 1. Open `/enroll/[token]`

**Server:** `app/enroll/[token]/page.tsx`

- Missing token → “Link not found”.
- `isInvitationExpired(invitation)` → “Link expired”.
- Strips private keys from `yelp_data` before client render.

### 2. Preview step (default)

**Client:** `app/enroll/[token]/EnrollClient.tsx` when `step === 'preview'` and `status !== 'paid'`.

- Heading: “Your listing preview”.
- `components/EnrollListingPreview.tsx` — static featured card (not loaded from search).
- Link: `` `/search?location=${city}&category=${category}` `` (`/search` redirects to `/` — see [search-redirect.md](./search-redirect.md)).
- Primary: **Yes — start my 30-day preview** → `POST /api/enroll/start-trial` (`lib/enrollment-trial.ts`) creates/updates `curated_businesses` with `is_trial` + `trial_ends_at` (default 30 days, `ENROLL_PREVIEW_TRIAL_DAYS`), sets invitation `status: 'trial'`, publishes listing.
- Secondary: subscribe now → checkout step.

### 3. Trial active

- After **start trial**, browser redirects via `lib/enroll-home-url.ts` to `/?location=…&category=…` (and `highlight=` when `curatedBusinessId` is known).
- Revisiting `/enroll/[token]` while `status === 'trial'` redirects the same way (brief “Taking you to QuickProList…”).
- When `trial_ends_at` passes without payment, see **[trial-expiration.md](./trial-expiration.md)** (drops out of search; optional win-back email).

### 4. Checkout step

- **Back to preview**.
- Shows `monthly_price` from invitation.
- **Go to secure checkout** → `POST /api/stripe/checkout` with JSON `{ token }` → browser redirect to Stripe Checkout URL (`lib/stripe.ts` `success_url` = `{returnUrl}?success=1`).

### 5. Return from Stripe

- URL `?success=1` → success screen (“Payment successful!”).
- **View your dashboard** link only when `PRO_DASHBOARD_ENABLED` is true and a `dashboardToken` exists (`lib/feature-flags.ts`).

### 6. After webhook (async)

Listing published in search; transactional welcome email may include a dashboard URL when **`PRO_DASHBOARD_ENABLED`**. See [stripe-webhook-effects.md](./stripe-webhook-effects.md).

---

## APIs

| Method | Path | Role |
|--------|------|------|
| POST | `/api/enroll/start-trial` | Start 30-day preview (no Stripe) |
| POST | `/api/stripe/checkout` | Create Checkout session |
| POST | `/api/stripe/webhook` | Stripe events (not user-initiated) |

---

## Key files

`lib/invitations.ts`, `lib/enrollment-trial.ts`, `lib/enroll-home-url.ts`, `app/enroll/[token]/EnrollClient.tsx`, `components/EnrollListingPreview.tsx`, `app/api/enroll/start-trial/route.ts`, `app/api/stripe/checkout/route.ts`, `lib/stripe.ts`, `app/api/stripe/webhook/route.ts`, `lib/kv.ts` (`publishCurated`).
