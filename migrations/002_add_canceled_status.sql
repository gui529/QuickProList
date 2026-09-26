ALTER TABLE enrollment_invitations
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;
