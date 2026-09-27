-- Track whether a win-back email has already been sent to a business whose
-- free trial expired without ever converting to a paid subscription
-- ('expired-trial' in lib/reports.ts's deriveStatus). Lets the win-back job
-- (lib/winback.ts, run on a schedule via app/api/cron/winback/route.ts) send
-- at most one win-back email per business even if it re-runs before the
-- business either subscribes or is removed.
ALTER TABLE curated_businesses
  ADD COLUMN IF NOT EXISTS winback_sent_at TIMESTAMPTZ;
