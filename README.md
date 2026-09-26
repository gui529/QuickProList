# QuickProList

QuickProList is a local-services directory. Visitors search for a category
of pro (plumber, electrician, etc.) in a city and get a merged list of
results: businesses QuickProList has manually curated/pinned for that
(category, city) pair, backed by paid subscriptions, filled out with live
results from the Yelp Fusion API up to a cap of 5 results per search.

Paying businesses get a pinned search slot and an optional "ProSite"
landing page with profile-view and contact-click tracking. Admins manage
curated listings, enrollment invitations, paid subscriptions, and outreach
campaigns from an authenticated `/admin` dashboard.

## Getting Started

Install dependencies, then run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to
see the result.

## Commands

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build (also catches type errors)
npm run lint     # lint
npm test         # run the test suite (vitest)
```

## Environment Variables

Set these in `.env.local` for local development (and in your hosting
provider's dashboard, e.g. Vercel, for production). Everything is
optional in the sense that the app degrades gracefully without live
credentials (e.g. curated lookups return empty and fall through to Yelp,
outbound email/SMS throw only when actually invoked), but each feature
below requires its corresponding vars to function.

### Yelp

- `YELP_API_KEY` — Yelp Fusion API key (server-side only). Powers live
  search results in `lib/yelp.ts`.

### Supabase

- `SUPABASE_URL` — Supabase project URL (server-side).
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side
  only). Used by `lib/kv.ts`, `lib/invitations.ts`, `lib/campaigns.ts`,
  `lib/listing-requests.ts`, `lib/reports.ts`, `lib/auth.ts`, and the
  Stripe webhook handler for all database and storage access.
- `NEXT_PUBLIC_SUPABASE_URL` — same URL, exposed to the browser for the
  Supabase Auth client (admin magic-link login).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/publishable key
  (browser).

### Stripe

- `STRIPE_SECRET_KEY` — Stripe secret key (server-side only). Used by
  `lib/stripe.ts` to create Checkout sessions for paid listings.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the webhook endpoint at
  `app/api/stripe/webhook/route.ts`, which listens for
  `checkout.session.completed`, `customer.subscription.updated`, and
  `customer.subscription.deleted` to activate, delist, or cancel a
  business's curated listing.

#### Configuring the Stripe webhook — local dev

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run
   `stripe login`.
2. With `npm run dev` running, forward events to the local webhook route:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Copy the `whsec_...` signing secret the CLI prints and set it as
   `STRIPE_WEBHOOK_SECRET` in `.env.local`.
4. Trigger test events (e.g. `stripe trigger checkout.session.completed`)
   to exercise the handler.

#### Configuring the Stripe webhook — production

1. In the Stripe Dashboard, go to **Developers → Webhooks → Add
   endpoint** and point it at
   `https://<your-domain>/api/stripe/webhook`.
2. Subscribe it to at least `checkout.session.completed`,
   `customer.subscription.updated`, and `customer.subscription.deleted`.
3. Copy the endpoint's signing secret into the production environment's
   `STRIPE_WEBHOOK_SECRET` (e.g. Vercel project settings).

### Resend (email)

- `RESEND_API_KEY` — Resend API key. Used by `lib/email.ts` to send
  outreach-campaign and notification emails.
- `RESEND_FROM_EMAIL` — verified "from" address for outgoing email.

### Twilio (SMS)

- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` — Twilio credentials. Used by
  `lib/sms.ts` to send outreach-campaign SMS.
- `TWILIO_FROM_NUMBER` — the Twilio phone number messages are sent from.

### Site

- `SITE_URL` — canonical site URL (no trailing slash), used to build
  absolute links in emails, Stripe checkout return URLs,
  `app/sitemap.ts`, and `app/robots.ts`.

## Architecture

See `CLAUDE.md` for the full architecture notes (data flow, key files,
curation model, and the `localStorage` schema for starred favorites).
