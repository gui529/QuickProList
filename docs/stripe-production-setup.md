# Wire Stripe payments on production

Production app: **https://www.quickprolist.com**  
Webhook URL: **https://www.quickprolist.com/api/stripe/webhook**

**Stripe branding uploads** (after deploy): `public/brand/icon-512.png` (square icon), `public/brand/logo-800.png` (wordmark). Source SVGs: `public/brand/icon.svg`, `public/brand/logo.svg`.

Dev/preview keeps **test** keys (`sk_test_…`, test webhook). Production uses **live** keys only.

---

## 1. Stripe Dashboard (live mode)

Toggle **Test mode off** (top right) before copying live keys.

1. **Activate the account** — [Settings → Business](https://dashboard.stripe.com/settings/business): profile, bank for payouts, charges enabled.
2. **Customer portal** — [Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal): turn on so `/api/stripe/portal` works after subscribe.
3. **Live secret key** — [Developers → API keys](https://dashboard.stripe.com/apikeys): copy **Secret key** (`sk_live_…`). Never commit it.
4. **Live webhook**
   - [Developers → Webhooks → Add endpoint](https://dashboard.stripe.com/webhooks/create)
   - Endpoint URL: `https://www.quickprolist.com/api/stripe/webhook`
   - **Listen to:** “Select events” and add:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Create endpoint → **Reveal** signing secret (`whsec_…`).

Send a **test webhook** from the endpoint page (`checkout.session.completed`) after Vercel env is set — expect **200** in Stripe’s log (not 400/500).

---

## 2. Vercel (Production environment only)

Project **home-help** → Settings → Environment Variables.

Add for **Production** (not Preview):

| Key | Value |
|-----|--------|
| `STRIPE_SECRET_KEY` | `sk_live_…` from step 1.3 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the **live** webhook in step 1.4 |
| `SITE_URL` | `https://www.quickprolist.com` (no trailing slash) |

Optional but recommended for paying pros:

| Key | Value |
|-----|--------|
| `PRO_DASHBOARD_ENABLED` | `true` — welcome email + `/dashboard/[token]` |
| `CRON_SECRET` | Random secret — Vercel cron auth for digest / win-back / trial-reminder |
| `UNSUBSCRIBE_SECRET` | Random secret — marketing email unsubscribe links (or reuse `CRON_SECRET`) |
| `RESEND_WEBHOOK_SECRET` | From Resend → Webhooks — bounces/complaints suppress outreach |

**Redeploy production** after saving env vars (Deployments → … → Redeploy, or push to `main`).

---

## 3. Verify before a real charge

1. **Webhook health** — Stripe → Webhooks → your endpoint → recent deliveries after “Send test event”.
2. **Checkout starts** — Admin → Invitations → create link → open `/enroll/[token]` → **Go to secure checkout** → Stripe Checkout loads (live mode shows real card form).
3. **Do not rely on `?success=1` alone** — listing goes live when **`checkout.session.completed`** hits the webhook.

---

## 4. First live payment (smoke test)

1. Create a **test invitation** (your business name, your email, low price if you edit `monthly_price` in DB or use default $29.99).
2. Complete checkout with a **real card** you can refund/cancel.
3. Confirm:
   - Stripe → Payment + Subscription exist
   - `enrollment_invitations.status` = `paid` on **production** Neon
   - Listing appears in search (or updates existing curated row)
   - Welcome email (needs `RESEND_*` on Production)
4. Cancel subscription in Stripe Customer portal or Dashboard → confirm listing **delists** from search (`customer.subscription.deleted` / `unpaid`).

---

## 5. Dev stays on test mode

Preview (`dev` branch) and local `.env.local` should keep:

- `STRIPE_SECRET_KEY` = `sk_test_…`
- `STRIPE_WEBHOOK_SECRET` = test endpoint or `stripe listen` secret
- `SITE_URL` = dev preview URL or `http://localhost:3000`

Use card `4242 4242 4242 4242` on dev only.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Checkout API 500 / “STRIPE_SECRET_KEY not configured” | Missing live key on **Production** or no redeploy |
| Webhook 500 “Webhook secret not configured” | Missing `STRIPE_WEBHOOK_SECRET` on Production |
| Webhook 400 Invalid signature | Wrong `whsec` (test secret on live endpoint or old endpoint) |
| Paid in Stripe, listing not live | Webhook failed — check Stripe delivery log + Vercel runtime logs |
| Portal fails | Customer portal not enabled in Stripe settings |

Runtime logs: Vercel → project → Logs, filter `/api/stripe/webhook`.
