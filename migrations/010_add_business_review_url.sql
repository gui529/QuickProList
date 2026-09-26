-- Shareable "leave us a review" link generator (see issue #27): lets an
-- admin (and, eventually, the business itself) hand customers a copyable
-- link/message asking for a fresh public review.
--
-- For Yelp-sourced pros, `lib/kv.ts` derives a default write-a-review link
-- from `yelp_id` (`https://www.yelp.com/writeareview/biz/{yelp_id}`) when
-- this column is unset, so this only needs to store an explicit override.
-- For manually-added pros there's no Yelp id to derive one from, so this
-- column is the only source of the review link (e.g. a Google Maps review
-- link), editable via `EditManualBusinessModal`.
ALTER TABLE curated_businesses
  ADD COLUMN IF NOT EXISTS review_url TEXT;
