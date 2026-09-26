-- Track subscription cancellation/expiry so a business drops out of search
-- results without deleting its curated_businesses row (keeps admin history
-- and lets it be relisted later if the subscription is reinstated).
--
-- NULL = listed/visible (default)
-- timestamp = delisted as of that time (hidden from search, mirrors the
-- trial_ends_at pattern already used for expired trials)
ALTER TABLE curated_businesses
  ADD COLUMN IF NOT EXISTS delisted_at TIMESTAMPTZ;
