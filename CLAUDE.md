# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Backlog

Open work for cloud agents lives in [GitHub Issues](https://github.com/gui529/QuickProList/issues),
not a file in this repo. Priority labels (`P0`/`P1`/`P2`), `needs-owner`,
and `in-progress` drive what gets picked up — see `.claude/agents/*.md`
(`backlog-worker`, `qa-validator`, `product-owner`) for the exact workflow
before starting any task in this repo when no other instruction is given.

## Commands

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build (run this to catch type errors)
npm run lint     # lint
```

## Environment Variables

Required in `.env.local`:
- `YELP_API_KEY` — Yelp Fusion API key (server-side only)
- `SUPABASE_URL` — Supabase project URL (server-side)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
- `NEXT_PUBLIC_SUPABASE_URL` — same URL, exposed to browser for Auth client
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/publishable key (browser)

## Architecture

**Next.js 16 App Router** — `params` and `searchParams` in page components are Promises and must be awaited.

### Data flow
- Search → `lib/search.ts:getMergedResults` — pins curated businesses, fills remainder from Yelp, capped at 5 (`MAX_RESULTS`)
- Yelp API → `lib/yelp.ts` → server-side only
- Curated businesses (Yelp snapshots + manually-added pros) → `lib/kv.ts` → Supabase `curated_businesses` table
- Manual photo uploads → Supabase Storage bucket `business-photos` (public)
- Starred favorites → browser `localStorage` only, no backend

### Key files
- `lib/search.ts` — `getMergedResults(where, category)` — merge logic for curated + Yelp
- `lib/yelp.ts` — `searchBusinesses` + `Business` type (`source: 'yelp' | 'manual'`, optional `yelpId` for dedupe)
- `lib/kv.ts` — `getCurated`, `addCuratedFromYelp`, `addCuratedManual`, `removeCurated`, `listAllCurated`, `uploadBusinessPhoto`, `normalizeCity`
- `lib/categories.ts` — category definitions
- `app/api/search/route.ts` — proxies merged search results
- `app/api/curated/route.ts` — GET (list/filter), POST (add yelp or manual; Bearer auth), DELETE (Bearer auth)
- `app/api/curated/photo/route.ts` — multipart upload to Supabase Storage (Bearer auth)
- `app/admin/page.tsx` — two-tab UI: curated list w/ remove, search Yelp to curate, manual-add modal
- `components/BusinessModal.tsx` — `YelpSnapshotModal` and `ManualBusinessModal`
- `components/BusinessCard.tsx` — shared card; shows "Verified pro" badge instead of stars when `source === 'manual'`

### Curation
Admin curates businesses per (category, city). User searches return up to 5 results: curated entries pinned first, Yelp results filling the rest. Cities are normalized to lowercase first segment (e.g. "Austin, TX" → "austin"); curated lookup is exact-match on this. Without Supabase credentials, `getCurated` returns empty and search falls through to live Yelp.

### localStorage schema
```json
{ "starred": { "<yelp-business-id>": { /* Business object */ } } }
```
