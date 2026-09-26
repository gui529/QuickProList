-- Baseline schema for a fresh Supabase project.
--
-- The rest of migrations/*.sql are incremental ALTER/CREATE statements that
-- assume `curated_businesses` and `admins` already exist. Neither table had
-- a baseline CREATE anywhere in this repo, so a fresh project could never be
-- bootstrapped from `migrations/` alone. This file fills that gap.
--
-- Run this FIRST, before any other file in migrations/, when bootstrapping a
-- new Supabase project. All other migrations remain additive (ALTER TABLE ...
-- ADD COLUMN IF NOT EXISTS / CREATE TABLE) and are safe to run after this one
-- in their existing order.
--
-- Incremental files are numbered (001_, 002_, ...) so that running
-- migrations/*.sql in plain alphabetical order always creates a table before
-- anything ALTERs or REFERENCES it. See migrations/order.test.ts, which
-- fails loudly if that invariant is ever broken (e.g. a new file added
-- without a correct numeric prefix).
--
-- Column list for curated_businesses cross-checked against:
--   - `CuratedRow` in lib/kv.ts
--   - the `.select()` in lib/reports.ts's getBusinessReports
--   - every `.insert()` / `.upsert()` / `.update()` call across lib/kv.ts
-- Column list for admins cross-checked against lib/auth.ts's `admins` query.

CREATE TABLE IF NOT EXISTS curated_businesses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  yelp_id           TEXT UNIQUE,
  source            TEXT NOT NULL DEFAULT 'manual',
  category          TEXT NOT NULL,
  cities            TEXT[] NOT NULL DEFAULT '{}',
  name              TEXT NOT NULL,
  phone             TEXT,
  address           TEXT,
  image_url         TEXT,
  website_url       TEXT,
  rating            NUMERIC(2,1),
  review_count      INTEGER,
  categories        TEXT[] DEFAULT '{}',
  trial_ends_at     TIMESTAMPTZ,
  is_trial          BOOLEAN NOT NULL DEFAULT FALSE,
  pro_site_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curated_category    ON curated_businesses(category);
CREATE INDEX IF NOT EXISTS idx_curated_cities       ON curated_businesses USING GIN (cities);
CREATE INDEX IF NOT EXISTS idx_curated_created_at   ON curated_businesses(created_at DESC);

CREATE TABLE IF NOT EXISTS admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
