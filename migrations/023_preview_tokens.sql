-- Unguessable contractor preview links (/preview/<token>).
-- Viewing a row updates only this table. It does not publish a listing.
CREATE TABLE IF NOT EXISTS preview_tokens (
  token TEXT PRIMARY KEY,
  prospect_id UUID REFERENCES campaign_prospects(id) ON DELETE SET NULL,
  curated_business_id UUID REFERENCES curated_businesses(id) ON DELETE SET NULL,
  invitation_token UUID,
  recipient_email TEXT NOT NULL,
  campaign_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_ref TEXT,
  last_user_agent TEXT,
  opted_out_at TIMESTAMPTZ,
  CONSTRAINT preview_tokens_email_nonempty CHECK (length(trim(recipient_email)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_preview_tokens_prospect ON preview_tokens (prospect_id);
CREATE INDEX IF NOT EXISTS idx_preview_tokens_email ON preview_tokens (lower(trim(recipient_email)));

ALTER TABLE preview_tokens ENABLE ROW LEVEL SECURITY;
