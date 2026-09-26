-- Persist "List your business" form submissions (app/api/list-business).
-- Previously these were only console.log'd and discarded; this table lets
-- an admin review and follow up on every lead.
CREATE TABLE business_listing_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_name  TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  category      TEXT NOT NULL,
  zip           TEXT NOT NULL,
  message       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_business_listing_requests_created_at ON business_listing_requests(created_at DESC);
