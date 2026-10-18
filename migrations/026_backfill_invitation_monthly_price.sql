-- Backfill enrollment invitations the admin trial path stored at 0 or NULL
-- so checkout can charge the canonical subscription price (29.99).
-- Unpaid and not canceled only. Paid and canceled rows keep their stored price.
-- Idempotent: a second run matches no rows once the price is 29.99.
--
-- Read-only count of the same rows (do not UPDATE just to count):
-- SELECT COUNT(*)
-- FROM enrollment_invitations
-- WHERE (monthly_price IS NULL OR monthly_price = 0)
--   AND status NOT IN ('paid', 'canceled')
--   AND canceled_at IS NULL;

UPDATE enrollment_invitations
SET monthly_price = 29.99
WHERE (monthly_price IS NULL OR monthly_price = 0)
  AND status NOT IN ('paid', 'canceled')
  AND canceled_at IS NULL;
