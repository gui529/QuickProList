-- Track how often a curated business appears in merged search results,
-- distinct from `profile_views` (which only fires on the /pro/[id] ProSite
-- page and requires the admin-only ProSite toggle). Lets the business-facing
-- dashboard report a non-zero stat for every paying/curated business, not
-- just ones with ProSite enabled.
ALTER TABLE curated_businesses
  ADD COLUMN IF NOT EXISTS search_impressions INTEGER NOT NULL DEFAULT 0;
