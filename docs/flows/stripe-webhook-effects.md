# Flow: Stripe webhook (subscription lifecycle)

**Not** a page users open. Stripe calls `POST /api/stripe/webhook` with signed events; outcomes affect listings and emails.

---

## Auth

`STRIPE_WEBHOOK_SECRET` + `stripe-signature` header (`app/api/stripe/webhook/route.ts`).

---

## `checkout.session.completed`

When `session.metadata.invitationToken` is set (from [enroll-paid-subscription.md](./enroll-paid-subscription.md)):

1. Skip if invitation already `paid`.
2. Create/update `curated_businesses` (Yelp data, existing id, or new manual row).
3. `markInvitationPaid` + `publishCurated` (clears `is_draft`).
4. Store Stripe customer email on curated row when present.
5. Send **transactional** `sendEmail` with dashboard URL when `PRO_DASHBOARD_ENABLED` and `dashboardToken` exist.

---

## `customer.subscription.deleted`

`handleSubscriptionCanceled` → invitation `canceled`, curated row delisted (`lib/stripe.ts`, `lib/kv.ts`).

---

## `customer.subscription.updated`

If status is `canceled` or `unpaid` → same delist path. `past_due` is **not** delisted in code (comment documents grace/retries).

---

## `invoice.payment_failed`

Transactional email to `contactEmail` on curated business when invitation/subscription can be resolved.

---

## Key files

`app/api/stripe/webhook/route.ts`, `lib/stripe.ts`, `lib/invitations.ts`, `lib/kv.ts`, `lib/email.ts`.
