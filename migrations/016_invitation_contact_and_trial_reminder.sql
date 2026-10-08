-- Campaign / enroll contact for win-back + trial-ending reminders
ALTER TABLE enrollment_invitations
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

ALTER TABLE curated_businesses
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at TIMESTAMPTZ;
