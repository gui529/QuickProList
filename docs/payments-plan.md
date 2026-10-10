# Payments plan

The enroll flow is built. A pro opens `/enroll/[token]`, pays a monthly Stripe subscription (default $29.99), and the webhook activates the listing. Production is not connected to Stripe yet.

## Already in the app

- Admin creates an enrollment link with a monthly price.
- `POST /api/stripe/checkout` starts a Stripe Checkout subscription.
- `POST /api/stripe/webhook` handles:
  - `checkout.session.completed` — mark the invitation paid, publish the listing, store the billing email, send the welcome email
  - `customer.subscription.updated` and `customer.subscription.deleted` — cancel and hide the listing when the subscription is unpaid or canceled
  - `invoice.payment_failed` — email the business to update their card
- `POST /api/stripe/portal` opens the Stripe customer portal so a paying pro can update a card or cancel.
- Local `.env.local` has a Stripe **test** secret key and a webhook secret. Those are not on Vercel.

## Still required

1. **Stripe account ready for live charges.** Business profile, payout bank account, and live mode enabled. Test mode stays for the dev site.
2. **Keys, split by environment.**
   - Production: live `STRIPE_SECRET_KEY` and the live webhook’s `STRIPE_WEBHOOK_SECRET`.
   - Dev preview and local Development: the existing test key, plus a test webhook secret for the dev host.
3. **Webhooks.**
   - Production endpoint: `https://www.quickprolist.com/api/stripe/webhook`
   - Dev endpoint: `https://home-help-git-dev-gui-costas-projects.vercel.app/api/stripe/webhook`
   - Events on both: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
4. **Customer portal turned on in Stripe.** Without it, “manage billing” fails even when Checkout works.
5. **`SITE_URL` on Vercel.** Production `https://www.quickprolist.com`. Dev preview the dev host. Checkout return links use this.
6. **One test payment on the dev site** with Stripe’s test card. The listing should appear only on the dev database, not on production.
7. **One live payment on production** after the live webhook is confirmed. The success page only checks `?success=1`. The listing is not real until the webhook runs.

## Not required to take the first payment

- A pre-built Stripe Product or Price. Each checkout already creates the monthly price from the invitation.
- Stripe Tax. Add it later if the listing fee needs sales tax.

## After the first live payment

- Confirm the business is visible in search, the welcome email arrived, and the dashboard link works.
- Cancel that subscription in Stripe and confirm the listing disappears from search.
