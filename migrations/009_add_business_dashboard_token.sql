-- Business-facing performance dashboard: a shareable, token-secured link
-- (`/dashboard/[token]`) each subscriber can bookmark to see their own
-- profile-view/click stats and status, without any login system. Mirrors
-- the existing UUID `token` pattern on `enrollment_invitations` — a
-- DB-generated default both backfills every pre-existing row (Postgres
-- evaluates a volatile default like `gen_random_uuid()` per-row on ALTER
-- TABLE ADD COLUMN) and covers every future INSERT, without `lib/kv.ts`
-- needing to set it explicitly (which would otherwise regenerate — and
-- invalidate — an already-shared link every time `addCuratedFromYelp`'s
-- `upsert(..., { onConflict: 'yelp_id' })` re-touches an existing row).
ALTER TABLE curated_businesses
  ADD COLUMN IF NOT EXISTS dashboard_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
