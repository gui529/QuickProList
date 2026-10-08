# Flow: Paid enrollment (invitation → preview → Stripe)

Business receives `/enroll/[token]` (from campaign email, win-back email, or an admin-copied link), previews a mock listing, optionally continues to Stripe Checkout, and becomes searchable after the webhook runs.

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
- Link: `` `/search?where=${city}&category=${category}` `` (as built in `EnrollClient`; `/search` redirects to `/` with query params — see [search-redirect.md](./search-redirect.md)).
- Button **Continue — activate listing** → checkout step (no payment yet).

### 3. Checkout step

- **Back to preview**.
- Shows `monthly_price` from invitation.
- **Go to secure checkout** → `POST /api/stripe/checkout` with JSON `{ token }` → browser redirect to Stripe Checkout URL (`lib/stripe.ts` `success_url` = `{returnUrl}?success=1`).

### 4. Return from Stripe

- URL `?success=1` → success screen (“Payment successful!”) and optional **View your dashboard** if `dashboardToken` was resolved server-side.

### 5. After webhook (async)

Listing published in search; transactional welcome email may include dashboard URL. See [stripe-webhook-effects.md](./stripe-webhook-effects.md).

---

## APIs

| Method | Path | Role |
|--------|------|------|
| POST | `/api/stripe/checkout` | Create Checkout session |
| POST | `/api/stripe/webhook` | Stripe events (not user-initiated) |

---

## Key files

`lib/invitations.ts`, `app/enroll/[token]/EnrollClient.tsx`, `components/EnrollListingPreview.tsx`, `app/api/stripe/checkout/route.ts`, `lib/stripe.ts`, `app/api/stripe/webhook/route.ts`, `lib/kv.ts` (`publishCurated`).
