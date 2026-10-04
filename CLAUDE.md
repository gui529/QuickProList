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
- `SUPABASE_URL` — Supabase project URL (server-side)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
- `NEXT_PUBLIC_SUPABASE_URL` — same URL, exposed to browser for Auth client
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/publishable key (browser)

## Architecture

**Next.js 16 App Router** — `params` and `searchParams` in page components are Promises and must be awaited.

### Data flow
- Search → `lib/search.ts:getMergedResults` — manually entered pros in the open Georgia towns, capped at 3 (`MAX_RESULTS`). Older `source: 'yelp'` rows are not shown.
- Curated businesses (manually-added pros) → `lib/kv.ts` → Supabase `curated_businesses` table
- Manual photo uploads → Supabase Storage bucket `business-photos` (public)
- Starred favorites → browser `localStorage` only, no backend

### Key files
- `lib/search.ts` — `getMergedResults(where, category)` — manual pros only, shared across the open towns
- `lib/business.ts` — `Business` type (`source: 'yelp' | 'manual'`; public search only returns `manual`)
- `lib/kv.ts` — `getCurated`, `addCuratedManual`, `removeCurated`, `listAllCurated`, `uploadBusinessPhoto`, `normalizeCity`
- `lib/categories.ts` — category definitions
- `app/api/search/route.ts` — proxies merged search results
- `app/api/curated/route.ts` — GET (list/filter), POST (manual add only; Bearer auth), DELETE (Bearer auth)
- `app/api/curated/photo/route.ts` — multipart upload to Supabase Storage (Bearer auth)
- `app/admin/page.tsx` — curated list with remove, plus a manual-add modal. No Yelp search.
- `components/BusinessModal.tsx` — `ManualBusinessModal` and `EditManualBusinessModal`
- `components/BusinessCard.tsx` — shared card; phone is a tap-to-call link. No rating is shown when `source === 'manual'`.

### Curation
Admin adds businesses by hand for the open Georgia towns (Acworth, Kennesaw, Marietta, Woodstock). User searches return up to 3 manual pros from that shared pool. Cities are normalized to lowercase first segment (e.g. "Kennesaw, GA" → "kennesaw"); curated lookup matches the open-town slugs. Without Supabase credentials, `getCurated` returns empty and search returns an empty list.

### localStorage schema
```json
{ "starred": { "<business-id>": { /* Business object */ } } }
```
