# QuickProList Backlog

Open work for cloud agents to pick up continuously. Human-only decisions live in
their own section at the bottom and must never be worked by an agent.

## Protocol (read this before touching anything)

1. **Pick one item.** Choose the highest-priority (P0 > P1 > P2) unchecked item in
   "Agent-workable items" that has no unresolved `Blocked by:`. Work on exactly one
   item per session/commit — don't bundle.
2. **Always work on a `claude/qpl-<id>-<slug>` branch off `main`. Never push to
   `main` directly, even for a trivial item.** `main` auto-deploys to production
   via Vercel — an unattended agent pushing straight to it is exactly the kind
   of unsupervised code integration Claude Code's own safety classifier exists
   to catch, and it will (correctly) block the session that tries. This isn't a
   gate to work around; it's why this rule exists. A branch push doesn't deploy
   anything — merging to `main` is a separate, human-reviewed step (or an
   interactive session the owner is actively watching).
   `git fetch origin` and check `git branch -r` before picking an item — skip
   anything that already has a `claude/qpl-<id>-*` branch, so two runs don't
   duplicate the same item.
3. **Before committing:** run `npm run build` and `npm run lint`. Both must pass
   (or explain in the commit body why a pre-existing failure is unrelated to
   your change — see AGENTS.md/CLAUDE.md for repo conventions). `npm test` must
   also pass if the item touches code covered by a test.
4. **Verify offline.** This environment usually has no `SUPABASE_*`, `STRIPE_*`,
   `YELP_API_KEY`, `RESEND_*`, or `TWILIO_*` credentials, and outbound network to
   `quickprolist.com` / `supabase.co` is often blocked. Every acceptance criterion
   below is written to be checkable with `npm run build`, `npm run lint`, and
   `npm test` alone — unit tests with mocked clients, not live calls. If an item's
   criterion can't be verified offline, add a test double or mock first (see QPL-000).
5. **Close the loop in the same commit:** check the box `[x]`, and add the commit
   SHA next to the item (`Done in <sha>`). One commit = one item = one checkbox flip.
   This edit lands on your branch, not `main` — the item won't show checked on
   `main` until the branch is merged. That's expected; step 2's branch check is
   what prevents duplicate work in the meantime, not the checkbox.
6. **No PRs unless the repo owner asks.** Push the branch and stop; the owner (or
   a separate review pass) decides when to open a PR and merge.
7. **QA loop.** Every `backlog-worker` run (`.claude/agents/backlog-worker.md`)
   is followed by a `qa-validator` run (`.claude/agents/qa-validator.md`) that
   rebuilds the branch, re-checks the acceptance criterion, and — for objective
   breakage (failed build/lint, a committed secret) — pushes a fix commit to
   that same branch (never touches `main`). Anything else it finds gets filed
   as a **new** item here — ID `QPL-<original>-QA<n>` — instead of just being
   reported and lost. If you see one of those IDs, it's a QA follow-up: treat
   it like any other item, same priority rules apply.

---

## Agent-workable items

### P0 — foundation (unblocks acceptance criteria for everything else)

- [ ] **QPL-000**: Add a test runner and first unit test.
  Install `vitest` as a dev dependency, add `"test": "vitest run"` to
  `package.json` scripts. Write `lib/search.test.ts` covering
  `getMergedResults` in `lib/search.ts` with `lib/kv.ts` and `lib/yelp.ts`
  mocked (`vi.mock`) — no network or Supabase needed. Cover: curated results
  fill first, Yelp fills the remainder, results cap at `MAX_RESULTS`, and
  `highlightId` dedupes correctly.
  **Acceptance:** `npm test` runs and passes with ≥3 passing cases; `npm run
  build` and `npm run lint` stay green.
  **Files:** `package.json`, new `lib/search.test.ts`, new `vitest.config.ts`.

- [ ] **QPL-001**: In-memory/SQLite test doubles for the Supabase-backed libs.
  Add a lightweight fake behind the same exported function signatures as
  `lib/kv.ts`, `lib/invitations.ts`, `lib/campaigns.ts`, `lib/reports.ts`
  (e.g. `lib/kv.test-double.ts` using an in-memory array or `better-sqlite3`),
  selected only under `NODE_ENV=test` / via dependency injection — never
  wired into the real app code path. This exists so later items (webhook
  logic, invitation expiry, etc.) can be unit-tested without live Supabase
  credentials. Do **not** attempt to replace Supabase in production — see
  "Needs owner" for why real local Postgres (`supabase start`) is the correct
  parity environment, and note in the file header that this double is
  test-only, not a dev-mode swap.
  **Acceptance:** a test using the double (e.g. `lib/invitations.test.ts`)
  passes under `npm test`; grep confirms the double is imported only from
  `*.test.ts` files, never from `app/` or non-test `lib/` files.
  **Files:** new `lib/*.test-double.ts`, new `lib/invitations.test.ts`.

### P0 — billing/data correctness bugs

- [ ] **QPL-002**: Stripe webhook doesn't handle subscription cancellation/expiry.
  `app/api/stripe/webhook/route.ts` only handles `checkout.session.completed`.
  Add handlers for `customer.subscription.deleted` and
  `customer.subscription.updated` (status `canceled`/`unpaid`/`past_due`) that
  call `markInvitationCanceled` (or a new "delist" path) and remove/hide the
  business from `curated_businesses` (or set a flag `getCurated` filters on,
  mirroring the existing `trial_ends_at` pattern).
  **Acceptance:** new unit test in `lib/stripe.test.ts` (mock the Stripe
  event object, call the route's handler function directly — refactor the
  webhook body into a testable exported function if needed) proves a
  `customer.subscription.deleted` event results in the invitation being
  marked canceled and the curated row being hidden from `getCurated`'s
  filter logic. `npm run build`/`lint` green.
  **Files:** `app/api/stripe/webhook/route.ts:864` (event type switch),
  `lib/invitations.ts` (`markInvitationCanceled`), `lib/kv.ts` (`getCurated`
  filter, currently only filters `trial_ends_at`).
  **Blocked by:** QPL-000, QPL-001 (for the test double/mock pattern).

- [ ] **QPL-003**: Multi-city enrollment only lists the business in one city.
  `app/api/stripe/webhook/route.ts:904` and `app/api/invitations/route.ts:311`
  (trial path) both call `addCuratedFromYelp(..., invitation.cities[0])` /
  `addCuratedFromYelp(..., cities[0])` — only the first city of a
  multi-city invitation. `addCuratedFromYelp` in `lib/kv.ts` already accepts
  only a single `city: string` and stores `cities: [normalizeCity(city)]`
  (a one-element array), overwriting on upsert. Fix: change
  `addCuratedFromYelp`'s signature to accept `cities: string[]` and store all
  of them (matching how `addCuratedManual` already supports multiple
  cities), then update both call sites to pass the full `cities` array.
  **Acceptance:** unit test proves that creating an invitation with 3 cities
  and simulating the webhook event results in a curated row whose `cities`
  array contains all 3, not just the first.
  **Files:** `lib/kv.ts` (`addCuratedFromYelp`), `app/api/stripe/webhook/route.ts:904`,
  `app/api/invitations/route.ts:311`.
  **Blocked by:** QPL-000, QPL-001.

- [ ] **QPL-004**: Stripe webhook is not idempotent — retries create duplicate rows.
  `app/api/stripe/webhook/route.ts` doesn't check `invitation.status === 'paid'`
  before processing `checkout.session.completed`, so a Stripe retry (common —
  Stripe retries on any non-2xx or timeout) re-runs `addCuratedFromYelp` /
  `addCuratedManual` and re-inserts. Guard: at the top of the handler, after
  loading the invitation, if `invitation.status === 'paid'` return
  `{ ok: true }` immediately (already-processed, no-op).
  **Acceptance:** unit test: call the handler twice with the same event
  payload; assert the curated-insert function is called exactly once (mock
  call count).
  **Files:** `app/api/stripe/webhook/route.ts:873` (after
  `getInvitationByToken`).
  **Blocked by:** QPL-000, QPL-001.

- [ ] **QPL-005**: Enrollment invitation `expires_at` is never enforced.
  `enrollment_invitations.expires_at` (set to now+30 days on insert) is read
  nowhere. `app/enroll/[token]/page.tsx` only checks `status === 'expired'`,
  which nothing ever sets. Add an `isExpired` check in
  `getInvitationByToken` (or the enroll page) comparing `expires_at` against
  `now`, treating an expired-but-still-`pending` invitation the same as
  `status === 'expired'` in both the enroll page and
  `app/api/stripe/checkout/route.ts` (currently only checks
  `status === 'expired'` at line 805).
  **Acceptance:** unit test: an invitation with `expires_at` in the past and
  `status: 'pending'` is rejected by the checkout route with a 410, and the
  enroll page's data-loading function returns the same "expired" state.
  **Files:** `lib/invitations.ts` (`getInvitationByToken` or a new
  `isInvitationExpired` helper), `app/api/stripe/checkout/route.ts:805`,
  `app/enroll/[token]/page.tsx:18`.
  **Blocked by:** QPL-000, QPL-001.

### P1 — data loss / correctness

- [ ] **QPL-006**: "List your business" submissions are discarded.
  `app/api/list-business/route.ts` only `console.log`s the submission — no
  persistence, no notification. Add a `business_listing_requests` table
  (new migration file `migrations/add_business_listing_requests.sql`
  matching the style of existing migrations) and insert via a new
  `lib/listing-requests.ts` module (mirror `lib/campaigns.ts`'s
  `getSupabase()` pattern). Optionally also email the admin via
  `lib/email.ts` if `RESEND_FROM_EMAIL`/admin address is configured — make
  this a soft failure (log, don't throw) so a missing Resend key doesn't
  break the form.
  **Acceptance:** unit test with a mocked Supabase client (per QPL-001)
  proves `POST /api/list-business` calls `insert` with the submitted fields.
  `npm run build`/`lint` green. New migration file is valid SQL (matches
  existing column/index style in `migrations/*.sql`).
  **Files:** new `migrations/add_business_listing_requests.sql`, new
  `lib/listing-requests.ts`, `app/api/list-business/route.ts`.
  **Blocked by:** QPL-000, QPL-001.

- [ ] **QPL-007**: Migrations don't reconstruct the schema from scratch.
  The `migrations/` directory only has 4 incremental ALTER/CREATE files; there
  is no baseline migration for `curated_businesses` or `admins`, which
  `lib/kv.ts` and `lib/auth.ts` both assume exist. Anyone bootstrapping a
  fresh Supabase project from this repo can't.
  **Acceptance:** a new `migrations/000_baseline.sql` exists containing
  `CREATE TABLE IF NOT EXISTS` statements for `curated_businesses` and
  `admins` with every column referenced in `lib/kv.ts`'s `CuratedRow`
  interface and `lib/auth.ts`'s `admins` query. Cross-check column names
  against `CuratedRow` (`lib/kv.ts:17-33`) and every `.select()`/`.insert()`
  call across `lib/kv.ts`, `lib/reports.ts`.
  **Acceptance is buildable offline** (it's a SQL file, not a live
  migration) — do not attempt to apply it in this task; that step is gated
  on QPL-020 (Supabase restore, owner-only) so a human can run it against
  the real project and confirm it matches the live schema via
  `mcp__Supabase__list_tables`.
  **Files:** new `migrations/000_baseline.sql`.
  **Blocked by:** none for writing the file; full verification blocked by QPL-020.

### P1 — security / correctness

- [ ] **QPL-008**: Open redirect in the auth callback.
  `app/auth/callback/route.ts:6` reads `next` from the query string and
  redirects to it unchecked (`req.nextUrl.searchParams.get('next') ?? '/admin'`).
  An attacker can craft `/auth/callback?code=...&next=https://evil.example`.
  Fix: only allow `next` values that are a same-origin relative path (start
  with `/` and don't start with `//` or contain a scheme).
  **Acceptance:** unit test: `next=https://evil.com` falls back to `/admin`;
  `next=/admin/campaigns` is honored; `next=//evil.com` (protocol-relative)
  is rejected.
  **Files:** `app/auth/callback/route.ts:6`.
  **Blocked by:** none (pure function, easily tested in isolation — extract
  the validation into a small exported helper, e.g. `lib/safe-redirect.ts`).

- [ ] **QPL-009**: In-memory rate limiter doesn't work across serverless instances.
  `lib/rate-limit.ts` keeps counts in a module-level `Map`, which is
  per-instance on Vercel's serverless runtime — under real traffic with
  multiple concurrent instances, the limit is far higher than configured and
  easily bypassed. This affects `/api/search` (Yelp quota protection) and
  `/api/stripe/checkout`.
  **Acceptance:** this item is a design change requiring a shared store
  (Vercel KV / Upstash Redis) which needs a real provisioned resource — so
  the *agent-workable* half is: refactor `lib/rate-limit.ts` behind an
  interface (`RateLimitStore` with `get`/`set` or `incr`) so a
  Redis-backed implementation can be swapped in later without touching call
  sites, and keep the current in-memory Map as the default implementation
  (documented as "single-instance only, replace before scaling"). Add a unit
  test for the interface's contract using the in-memory implementation.
  **Acceptance:** `npm test` covers window-reset and max-requests behavior
  against the interface, not the concrete class. Provisioning a real Redis
  store is owner work — see "Needs owner."
  **Files:** `lib/rate-limit.ts`.
  **Blocked by:** QPL-000.

- [ ] **QPL-010**: Checkout return URL depends on the `Origin` header.
  `app/api/stripe/checkout/route.ts:813` builds `returnUrl` from
  `req.headers.get('origin')`, which can be absent (some clients/proxies
  omit it) or spoofed. Prefer `process.env.SITE_URL` (already used
  elsewhere, e.g. `lib/email.ts`) with a fallback to the origin header only
  if `SITE_URL` is unset.
  **Acceptance:** unit test: with `SITE_URL` set, `returnUrl` ignores the
  Origin header entirely; with it unset, falls back to Origin; with neither,
  falls back to the same default used in `lib/email.ts`
  (`https://www.quickprolist.com`).
  **Files:** `app/api/stripe/checkout/route.ts:813`.
  **Blocked by:** QPL-000.

### P2 — hardening / hygiene

- [x] **QPL-011**: Fix the 14 ESLint errors from the current audit. Done in 8f048929aaedc806337074d2f664d3adc3098398.
  Run `npx eslint . -f json` and fix each reported error (not warnings) —
  `set-state-in-effect` in `AdminClient.tsx`, `EnrollClient.tsx`,
  `app/page.tsx`, `CampaignReportsTab.tsx`, `CityAutocomplete.tsx`,
  `ShareLinkModal.tsx`; `no-explicit-any` in `AdminClient.tsx:32` and
  `app/api/stripe/webhook/route.ts:33`; unescaped entities in
  `EnrollClient.tsx:77` and `CampaignTab.tsx:363`; impure `Date.now()` call
  in `TrialModal.tsx:114`; hoisting warnings in `PaidProsTab.tsx:56` and
  `ReportsTab.tsx:126` (rename/reorder to silence, behavior is already
  correct). Do this as several small commits (one rule/file group per
  commit) rather than one giant diff, per the protocol's "one item per
  commit" — treat sub-groups as sub-items of QPL-011 if useful.
  **Acceptance:** `npm run lint` exits 0 with zero errors (warnings may
  remain — clean those up too if convenient, not required for this item).
  **Files:** as listed above.
  **Blocked by:** none.

- [ ] **QPL-012**: Add error/404/loading pages.
  Next.js App Router supports `app/error.tsx`, `app/not-found.tsx`,
  `app/loading.tsx`. None exist — check
  `node_modules/next/dist/docs` for the current Next 16 conventions per
  AGENTS.md before implementing (this app's Next version may have moved or
  renamed these files; verify, don't assume).
  **Acceptance:** `npm run build` succeeds and includes the new
  routes/files in its route list output; a manual code-level check (not
  live-server) confirms the files export the shape Next 16's docs describe.
  **Files:** new `app/error.tsx`, `app/not-found.tsx`.
  **Blocked by:** none.

- [ ] **QPL-013**: `robots.txt`, sitemap, and per-page metadata.
  Add `app/robots.ts` and `app/sitemap.ts` (Next.js file-convention
  metadata routes), and add `generateMetadata` to
  `app/pro/[id]/page.tsx` for per-listing title/description/OG tags (pull
  from the `Business` object already fetched there).
  **Acceptance:** `npm run build` succeeds and lists `/robots.txt` and
  `/sitemap.xml` in its output; `app/pro/[id]/page.tsx` exports
  `generateMetadata` returning a title including the business name.
  **Files:** new `app/robots.ts`, new `app/sitemap.ts`,
  `app/pro/[id]/page.tsx`.
  **Blocked by:** none.

- [ ] **QPL-014**: Verify `middleware.ts` vs Next 16's `proxy.ts` convention.
  AGENTS.md warns this Next.js version has renamed/changed conventions from
  training-data expectations. The build output already shows
  `ƒ Proxy (Middleware)`, meaning the current `middleware.ts` file is being
  picked up and working — so this is a **verify-first, don't blindly
  rename** task. Read `node_modules/next/dist/docs/` (per AGENTS.md) for
  the current middleware/proxy convention in the installed Next 16 version.
  Only rename `middleware.ts` → `proxy.ts` (or otherwise change it) if the
  docs explicitly say the current filename is deprecated and will stop
  working; if the docs confirm `middleware.ts` is still valid, close this
  item as "verified, no change needed" and check the box.
  **Acceptance:** commit message or a code comment cites the specific doc
  file/section read, and states the conclusion either way. `npm run build`
  still shows the middleware/proxy route registered correctly afterward.
  **Files:** `middleware.ts`.
  **Blocked by:** none.

- [ ] **QPL-015**: README still has default `create-next-app` boilerplate.
  Replace `README.md` with real project docs: what the app does, `npm run
  dev`/`build`/`lint`/`test`, required env vars (mirror the list already in
  `CLAUDE.md`), and how to configure the Stripe webhook
  (`stripe listen --forward-to localhost:3000/api/stripe/webhook` for local
  dev, and the production webhook URL/events to register in the Stripe
  dashboard).
  **Acceptance:** `README.md` no longer contains the string
  `create-next-app`; contains a "Environment Variables" section listing at
  least the vars in `CLAUDE.md`'s Environment Variables section.
  **Files:** `README.md`.
  **Blocked by:** none.

- [ ] **QPL-016**: Sanitize/escape user-controlled text injected into campaign email HTML.
  `lib/email.ts` interpolates `businessName` and the campaign `body` text
  directly into an HTML string with no escaping. Currently only admins
  (via `/admin/campaigns`) supply this text, so risk is low, but it should
  still be escaped defensively in case a future feature (e.g. Yelp business
  names with special characters, or a future non-admin input path) injects
  untrusted content.
  **Acceptance:** add a small `escapeHtml` helper and apply it to
  `businessName` and each line of `body` before interpolation; unit test
  proves `<script>` in a business name is rendered as `&lt;script&gt;` in
  the output HTML, and that the plaintext `text` fallback is unaffected
  (should NOT be escaped, since it's plain text).
  **Files:** `lib/email.ts`.
  **Blocked by:** QPL-000.

---

## Needs owner (not agent work — do not pick these up)

These require credentials, legal judgment, or content only the repo owner can
provide. An agent should never attempt these, even if blocked items above
seem to invite it.

- **QPL-020**: Restore and upgrade the paused Supabase project
  (`quickprolist`, project ref `jrjaufrjgnhdobehdwcb`, currently `INACTIVE`).
  Move off the free tier so it can't auto-pause again before/at launch.
  Owner action in the Supabase dashboard.
- **QPL-021**: TCPA (SMS marketing) and CAN-SPAM (email marketing) legal
  review of the outreach campaign feature (`lib/campaigns.ts`,
  `app/api/campaigns/send/route.ts`, `lib/sms.ts`, `lib/email.ts`). Needs a
  lawyer's opinion before running campaigns at volume — covers consent
  requirements, opt-out list enforcement (currently "reply unsubscribe" is
  not tracked or checked against future sends), and required postal address
  in marketing emails.
- **QPL-022**: Privacy Policy and Terms of Service page content. An agent
  may scaffold `app/privacy/page.tsx` and `app/terms/page.tsx` with routing
  and layout, but the legal content must be written or approved by the
  owner — do not have an agent write binding legal text.
- **QPL-023**: Decide the Yelp API Terms of Service posture. Storing Yelp
  business ratings/photos/addresses long-term in `curated_businesses`
  (`lib/kv.ts`) may exceed what Yelp's Fusion API terms permit retaining
  beyond the business ID. Needs an owner decision (read Yelp's ToS, possibly
  contact Yelp) before this is a code task.
- **QPL-024**: Provision a real shared rate-limit store (Vercel KV or
  Upstash Redis) and wire it into the `RateLimitStore` interface added in
  QPL-009. Requires creating and paying for a real resource + adding its
  credentials to Vercel's environment variables.
