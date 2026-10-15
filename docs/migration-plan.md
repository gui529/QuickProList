# Neon Postgres and R2

Historical cutover notes. Production at `www.quickprolist.com` runs Neon + Cloudflare R2.

## 1. Database

- [x] Copy the public schema and rows into Neon `neondb` (production branch).
- [x] App code reads and writes Neon when `DATABASE_URL` is set (`lib/db.ts`).

## 2. Photos

- [x] Create the R2 bucket `quickprolist-photos`.
- [x] Public host configured; legacy hosted photo objects migrated into R2.
- [x] Stored image URLs in Neon point at the R2 public host.

## 3. Code

- [x] Data access via Neon (`lib/db.ts`): `lib/kv.ts`, `lib/auth.ts`, `lib/invitations.ts`, `lib/campaigns.ts`, `lib/reports.ts`, `lib/listing-requests.ts`, `lib/suppressions.ts`, Stripe webhook, invitations API.
- [x] `uploadBusinessPhoto` uses R2 (`lib/storage.ts`).
- [x] R2 image host allowed in `next.config.ts`.
- [x] Set `DATABASE_URL` and R2 vars on Vercel (Production, Preview, Development).
- [x] Removed obsolete third-party database env vars from Vercel.

Google sign-in stays on Auth.js. It does not move.
