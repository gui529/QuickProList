-- Track trial state and expiry on invitations
ALTER TABLE enrollment_invitations
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Filter expired trials at query time in curated_businesses.
-- NULL = paid pro (no expiry) OR unlimited trial (always visible)
-- future timestamp = active limited trial (visible)
-- past timestamp = expired trial (hidden from search)
ALTER TABLE curated_businesses
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
