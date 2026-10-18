# Flow: Stripe webhook (subscription lifecycle)

**Not** a page users open. Stripe calls `POST /api/stripe/webhook` with signed events; outcomes affect listings and emails.

---

## Auth

`STRIPE_WEBHOOK_SECRET` + `stripe-signature` header (`app/api/stripe/webhook/route.ts`).

---

## `checkout.session.completed`

When `session.metadata.invitationToken` is set (from [enroll-paid-subscription.md](./enroll-paid-subscription.md)):

1. If the invitation is already `paid`, do not insert the listing again. If the confirmation was never sent and Stripe included a customer email, send that confirmation and return.
2. Create/update `curated_businesses` (Yelp data, existing id, or new manual row).
3. `markInvitationPaid` + `publishCurated` (clears `is_draft`). `clearCuratedTrial` drops any unused preview days.
4. Store Stripe customer email on curated row when present.
5. Send a subscription confirmation (`sendCommercialNotice`, suppression not enforced, compliant footer still attached) with the price, monthly auto-renewal, billing-starts sentence, and a prefilled `mailto:contact@quickprolist.com` cancel link. Include a dashboard URL only when `PRO_DASHBOARD_ENABLED` and `dashboardToken` exist. Record `subscription_confirmation_sent_at` after a successful send.

---

## `customer.subscription.deleted`

`handleSubscriptionCanceled` → invitation `canceled`, curated row delisted (`lib/stripe.ts`, `lib/kv.ts`).

---

## `customer.subscription.updated`

If status is `canceled` or `unpaid` → same delist path. `past_due` is **not** delisted in code (comment documents grace/retries).

---

## `invoice.upcoming`

Before each renewal, when the invoice's `period_end` is inside `RENEWAL_NOTICE_LEAD_HOURS` (default 240). Sends the price, auto-renewal, and the same cancel mailto. Skips a repeat for the same period (`renewal_notice_period_end`). Stripe must be subscribed to this event; the lead time has to be at least as long as the dashboard's upcoming-invoice schedule or the notice is skipped.

---

## `invoice.payment_failed`

Transactional email to `contactEmail` on curated business when invitation/subscription can be resolved.

---

## Key files

`app/api/stripe/webhook/route.ts`, `lib/stripe.ts`, `lib/invitations.ts`, `lib/kv.ts`, `lib/email.ts`.
