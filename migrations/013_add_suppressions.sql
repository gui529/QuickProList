-- Do-not-contact list: emails/phones that must never receive marketing
-- messages (SMS STOP replies, email unsubscribes, bounces, spam complaints).
CREATE TABLE suppressions (
  channel    TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  value      TEXT NOT NULL,
  reason     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel, value)
);

ALTER TABLE suppressions ENABLE ROW LEVEL SECURITY;
