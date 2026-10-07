-- New admin-added pros stay out of search until they are enrolled or put on a trial.
ALTER TABLE curated_businesses
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE;
