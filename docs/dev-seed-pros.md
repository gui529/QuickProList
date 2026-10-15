# Seeding real pros on the dev database

Use this when you want **homeowner search** on the [dev site](https://home-help-git-dev-gui-costas-projects.vercel.app) (or local `npm run dev`) populated with real businesses **without** campaign email. Data lives in Neon **`dev`** branch only — confirm `.env.local` `DATABASE_URL` points at dev ([dev-database-plan.md](./dev-database-plan.md)).

## What shows up in search

| Table | Role |
|-------|------|
| `curated_businesses` | Public listings (`source = 'manual'`, `is_draft = false`, `delisted_at` null) |
| `campaign_prospects` / `campaign_contacts` | Outreach queue only — **not** used for search |

Category slugs must match `lib/categories.ts` (e.g. `plumbing`, `airconditioningheating`, `generalcontractors`). City slugs must match `lib/open-towns.ts` (e.g. `atlanta`, `marietta`). All opened towns share one listing pool via `getCuratedInArea`.

## Profile pictures (why they were missing)

Search cards read `curated_businesses.image_url` (`BusinessCard` → `next/image`). Allowed image hosts are in `next.config.ts` (Pexels, Unsplash, R2) — **not** arbitrary business-site URLs.

- **Campaign “Fetch logo”** writes `logo_url` on prospects/contacts only; it does not update curated listings.
- **Admin add pro** can upload to R2 or pick a category default in `BusinessModal`.
- Rows inserted with SQL and no `image_url` show the gray **house** placeholder until images are set.

Image pipeline (shared code in `lib/curated-image.ts`):

1. Fetch homepage → `lib/website-logo.ts` (`og:image`, icons).
2. Download bytes → upload to **R2** (`R2_*` env vars).
3. If that fails → **Pexels** stock for that category (`lib/category-images.ts`).

After **publish** or **manual add** with a website and no photo, the app runs the same helper automatically (`publishCurated`, `addCuratedManual` in `lib/kv.ts`).

## Recommended workflow (pros + pictures together)

1. Research real businesses (name, phone, address, website). Use public sources; do not send campaign mail.
2. Copy `data/dev-seed-pros.example.json` → e.g. `data/dev-seed-pros-atlanta.json` and fill in your list (`published: true` for immediate search).
3. From repo root with dev `.env.local` (needs `DATABASE_URL` + R2):

```bash
npm run seed:pros -- data/dev-seed-pros-atlanta.json
```

The script inserts any new rows (skips same `name` + `category`), then calls `ensureCuratedBusinessImage` for each.

Dry run:

```bash
npm run seed:pros -- data/dev-seed-pros-atlanta.json --dry-run
```

To fix images on **existing** published rows only:

```bash
npm run backfill:logos
```

## What we did once (Oct 2025 — Atlanta tryout)

**Goal:** 2 real pros per trade × 10 categories on dev, no emails.

1. **Inserted 20 rows** on Neon dev via SQL (`curated_businesses`): `source = 'manual'`, `is_draft = false`, `is_trial = false`, fields `category`, `cities[]`, `name`, `phone`, `address`, `website_url`. No `image_url` (mistake — cards showed placeholders).
2. **Did not** use `campaign_prospects` (would enable outreach).
3. **Cleaned up** fake campaign demo row + draft “Genie Flooring” + related invitations.
4. **Backfilled photos** in a second step with `scripts/backfill-curated-logos.ts` (now `npm run backfill:logos`).

**Trades seeded (2 each):** plumbing, electricians, HVAC (`airconditioningheating`), roofing, painting (`paintingcontractors`), landscaping, pest control (`pestcontrol`), home cleaning (`homecleaning`), general contractors (`generalcontractors`), locksmiths — mostly `cities = ['atlanta']`, TE Certified under `marietta`.

**Next time:** use `npm run seed:pros` so insert + images happen in one pass.

## Admin UI alternative

**Admin → Pros → Add** still creates **drafts** (`is_draft = true`) until published. Upload a photo or pick a default in the modal; if you only set a website, saving/publishing triggers logo → R2 when possible.

## Agents / skills

This is a **repo script + doc**, not a Cursor skill or `.claude/agents` role. Point agents at this file and `npm run seed:pros` / `npm run backfill:logos`.
