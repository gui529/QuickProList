CREATE TABLE enrollment_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  yelp_id TEXT,
  yelp_data JSONB,
  category TEXT NOT NULL,
  cities TEXT[] NOT NULL,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 29.99,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  curated_business_id UUID REFERENCES curated_businesses(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_enrollment_token ON enrollment_invitations(token);
CREATE INDEX idx_enrollment_status ON enrollment_invitations(status);
CREATE INDEX idx_enrollment_created ON enrollment_invitations(created_at DESC);
