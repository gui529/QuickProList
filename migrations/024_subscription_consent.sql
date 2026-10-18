-- Records express checkout consent and the renewal period we already notified.
-- Not applied by this change. Preview deploy on dev applies it; production applies it only when dev is promoted to main.

ALTER TABLE enrollment_invitations
  ADD COLUMN IF NOT EXISTS subscription_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_consent_text TEXT,
  ADD COLUMN IF NOT EXISTS renewal_notice_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_confirmation_sent_at TIMESTAMPTZ;
