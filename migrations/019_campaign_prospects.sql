-- Outreach queue: AI/discovery fills rows; admin approves/sends from the app.
CREATE TABLE campaign_prospects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name   TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  website         TEXT,
  category        TEXT NOT NULL,
  city            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'sent', 'failed')),
  discovery_notes TEXT,
  search_query    TEXT,
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_prospects_status ON campaign_prospects (status);
CREATE INDEX idx_campaign_prospects_created_at ON campaign_prospects (created_at DESC);

CREATE UNIQUE INDEX campaign_prospects_email_active
  ON campaign_prospects (lower(trim(email)))
  WHERE status NOT IN ('rejected', 'failed');

ALTER TABLE campaign_prospects ENABLE ROW LEVEL SECURITY;
