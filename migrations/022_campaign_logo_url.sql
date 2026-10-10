ALTER TABLE campaign_prospects
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE campaign_contacts
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
