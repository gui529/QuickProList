-- Idempotency for the transactional renewal receipt on invoice.paid.
-- One row per invitation stores the Stripe invoice id already emailed, so a
-- webhook retry does not send the receipt twice. Does not touch campaign mail.
ALTER TABLE enrollment_invitations
  ADD COLUMN IF NOT EXISTS renewal_confirmation_invoice_id TEXT;
