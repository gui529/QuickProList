-- Contact email captured from Stripe Checkout's `customer_details` at
-- checkout.session.completed time, used to send a dunning notice when a
-- subscription's payment fails (invoice.payment_failed) during the grace
-- period before the harsher terminal states (canceled/unpaid) delist it.
ALTER TABLE curated_businesses
  ADD COLUMN IF NOT EXISTS contact_email TEXT;
