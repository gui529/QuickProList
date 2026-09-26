-- Lead-analytics foundation: per-business counters for ProSite profile
-- views and contact-link clicks (phone/website/directions), surfaced later
-- by the business-facing performance dashboard.
ALTER TABLE curated_businesses
  ADD COLUMN IF NOT EXISTS profile_views INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone_clicks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS website_clicks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS directions_clicks INTEGER NOT NULL DEFAULT 0;
