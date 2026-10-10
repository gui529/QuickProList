-- Track manual admin confirmation when a pro replies yes/no to outreach.
ALTER TABLE campaign_contacts
  ADD COLUMN IF NOT EXISTS pro_response TEXT
    CHECK (pro_response IS NULL OR pro_response IN ('yes', 'no'));

ALTER TABLE campaign_contacts
  ADD COLUMN IF NOT EXISTS pro_response_at TIMESTAMPTZ;
