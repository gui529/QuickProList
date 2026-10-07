# Supabase to Neon and R2

Order: database, then photos, then code. Production at `www.quickprolist.com` is running this code. Git `main` was not updated.

## 1. Database

- [x] Copy the public schema and rows into Neon `neondb` (Project Alpha, production branch).
- [x] Confirm counts: admins 2, curated_businesses 2, campaign_contacts 8, business_submissions 1. Empty tables included: enrollment_invitations, business_listing_requests, suppressions, marketing_suppressions.
- [x] Final row sync from the live Supabase project `quickprolist` immediately before the code cutover.
- [x] App code now reads and writes Neon when `DATABASE_URL` is set.

## 2. Photos

- [x] Create the R2 bucket `quickprolist-photos` (Eastern North America, Standard).
- [x] Turn on public reads. Public host: `pub-6b31b57ad0c04684b1b13fea4595a462.r2.dev`.
- [x] Copy the Supabase `business-photos` object into R2 (1 file).
- [x] Rewrite the one stored Supabase image URL in Neon to that R2 host.

## 3. Code

- [x] Replace `supabase-js` database calls with Neon (`lib/db.ts`). Files: `lib/kv.ts`, `lib/auth.ts`, `lib/invitations.ts`, `lib/campaigns.ts`, `lib/reports.ts`, `lib/listing-requests.ts`, `lib/suppressions.ts`, `app/api/stripe/webhook/route.ts`, `app/api/invitations/route.ts`.
- [x] Point `uploadBusinessPhoto` at R2 (`lib/storage.ts`).
- [x] Allow the R2 image host in `next.config.ts`.
- [x] Update tests that mocked `@supabase/supabase-js`. `npm test`: 53 files, 314 tests passed.
- [x] Set `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and `R2_PUBLIC_URL` in `.env.local` and on Vercel for Production, Development, and Preview (`dev` and `master`).
- [x] Deployed to Vercel production and checked search for Kennesaw general contractors. The listing image loads from R2.
- [x] Removed `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Vercel.
- [ ] Push to git `main` only when asked. GitHub `main` still has the old Supabase code, so a deploy from that branch would roll production back.

Google sign-in stays on NextAuth. It does not move.
