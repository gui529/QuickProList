CREATE TABLE campaign_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  yelp_id       TEXT,
  business_name TEXT NOT NULL,
  phone         TEXT NOT NULL,
  category      TEXT,
  city          TEXT,
  message_body  TEXT NOT NULL,
  message_sid   TEXT,
  status        TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_contacts_sent_at ON campaign_contacts(sent_at DESC);
CREATE INDEX idx_campaign_contacts_status  ON campaign_contacts(status);
