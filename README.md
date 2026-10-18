# QuickProList

QuickProList is a local-services directory. Visitors search for a category
of pro (plumber, electrician, etc.) in a city and get the businesses an
admin has added for that (category, city) pair, up to a cap of 3 results
per search. Search reads only from Neon Postgres (curated listings); there is no third-party
listing API.

Paying businesses get a pinned search slot and an optional "ProSite"
landing page with profile-view and contact-click tracking. Admins manage
curated listings, enrollment invitations, paid subscriptions, and outreach
campaigns from an authenticated `/admin` dashboard.

**Production:** https://www.quickprolist.com — launch moment documented in [docs/production-launch.md](docs/production-launch.md).

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
npm run build    # run pending DB migrations, then production build
npm run migrate  # apply pending migrations/ SQL (uses DATABASE_URL)
npm run lint     # lint
npm test         # run the test suite (vitest)
```

## Environment Variables

Set these in `.env.local` for local development (and in your hosting
provider's dashboard, e.g. Vercel, for production). Everything is
optional in the sense that the app degrades gracefully without live
credentials (e.g. searches return no pros,
outbound email/SMS throw only when actually invoked), but each feature
below requires its corresponding vars to function.

### Database (Neon)

- `DATABASE_URL` — Neon Postgres connection string (server-side only). Used by
  `lib/db.ts` for curated businesses, admins, invitations, campaigns, reports,
  listing requests, and suppressions.

### Photos (Cloudflare R2)

- `R2_ACCOUNT_ID` — Cloudflare account id.
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` — R2 S3 credentials.
- `R2_BUCKET` — bucket name (`quickprolist-photos`).
- `R2_PUBLIC_URL` — public base URL for uploaded photos.

### Admin login (Auth.js + Google)

Admin sign-in uses [Auth.js](https://authjs.dev) (`next-auth` v5) with the
Google provider only and JWT session cookies. A signed-in Google account is
an admin only if its email is in the `admins` table.

- `AUTH_SECRET` — random secret used to sign the session JWT. Generate with
  `npx auth secret` or `openssl rand -base64 33`.
- `AUTH_GOOGLE_ID` — Google OAuth client ID.
- `AUTH_GOOGLE_SECRET` — Google OAuth client secret.
- `AUTH_TRUST_HOST=true` — optional. Vercel is detected automatically; set it
  only when self-hosting behind a proxy.

Public pages render without these variables. Without them, `/admin` simply
redirects to `/login` and the header hides the Dashboard link.

#### Creating the Google OAuth client

1. In [Google Cloud Console](https://console.cloud.google.com/), create or
   select a project, then configure the OAuth consent screen (APIs & Services
   > OAuth consent screen).
2. Go to APIs & Services > Credentials > Create credentials > OAuth client
   ID, and choose application type **Web application**.
3. Under **Authorized redirect URIs**, add:
   - `https://www.quickprolist.com/api/auth/callback/google`
   - `https://home-help-git-dev-gui-costas-projects.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (local dev)
4. Copy the client ID and secret into `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET`.
5. In Vercel (Project Settings > Environment Variables) set `AUTH_SECRET`,
   `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` for Production and Preview, then
   redeploy.

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
- `RESEND_FROM_EMAIL` — verified address on your Resend domain (e.g. `jeremy@quickprolist.com`). Use a bare address; do not embed the display name here unless you want the same **From** on every email type.
- `CAMPAIGN_SENDER_NAME` (optional) — human name for cold outreach **From** (`Jeremy <jeremy@quickprolist.com>`) and `{signature}` (e.g. `— Jeremy, QuickProList`). Transactional mail still uses `QuickProList <…>` when the env value is bare.
- `ENROLL_PREVIEW_TRIAL_DAYS` (optional) — days for self-serve enroll preview from campaign links (default `30`).
- `PRO_DASHBOARD_ENABLED` (optional) — set to `true` to expose `/dashboard/[token]` to pros, admin dashboard links, and performance digests. Default **off**; production stays off (do not recommend enabling).
- `TRIAL_REMINDER_HOURS` (optional) — how far before `trial_ends_at` to send the trial-ending email (default `120`, about 5 days).
- `CAMPAIGN_POSTAL_ADDRESS` — mailing address required before a commercial trial-reminder (and send-ready campaign mail) can go out. Not stored in the repo. Do not invent one.
- `UNSUBSCRIBE_SECRET` — signs one-click unsubscribe links in marketing email (or set `CRON_SECRET` to the same value). Required before campaign or win-back sends.
- `RESEND_WEBHOOK_SECRET` (optional) — verifies `POST /api/resend/webhook` for bounces/complaints → suppression list.

SQL migrations in `migrations/` run automatically on Vercel build (`npm run migrate`). See [docs/migrations.md](docs/migrations.md). Existing databases need a one-time `npm run migrate:baseline` per Neon branch before the first automated deploy.

### Scheduled jobs (Vercel Cron)

`vercel.json` calls `/api/cron/digest`, `/api/cron/winback`, and `/api/cron/trial-reminder`. Each requires:

- `CRON_SECRET` — Vercel sends `Authorization: Bearer …` on cron invocations when this is set. Without it, crons return **401** and digests/reminders never run.

Performance digests are skipped unless `PRO_DASHBOARD_ENABLED=true` (we keep it off). Win-back and trial-reminder need the marketing email vars above.

### Campaign outreach (optional)

- `CAMPAIGN_OUTREACH_SECRET` — bearer token for the local `outreach/` CLI → `POST /api/campaigns/prospects`.
- `SMS_OUTREACH_ENABLED` — set to `true` to allow campaign SMS (`lib/sms.ts`; default off).

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
