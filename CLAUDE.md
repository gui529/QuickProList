# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Git branches

- Do all repo work on **`dev`** (`git checkout dev`, pull before you start).
- **`main`** auto-deploys production — **never** merge or push to `main` unless the owner explicitly asks to promote `dev` → `main`.

## Backlog

Open work for cloud agents lives in [GitHub Issues](https://github.com/gui529/QuickProList/issues),
not a file in this repo. Priority labels (`P0`/`P1`/`P2`), `needs-owner`,
and `in-progress` drive what gets picked up — see `.claude/agents/*.md`
(`backlog-worker`, `qa-validator`, `product-owner`, `marketing-agent`) for the exact workflow
before starting any task in this repo when no other instruction is given.

## Commands

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build (run this to catch type errors)
npm run lint     # lint
```

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` — Neon Postgres connection string (server-side only)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` — Cloudflare R2 for business photos
- `AUTH_SECRET` — Auth.js (next-auth v5) JWT signing secret (`npx auth secret`)
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google OAuth web client credentials
- `AUTH_TRUST_HOST=true` — only if Auth.js rejects the host (not needed on Vercel)

Optional (local agents / DNS ops, not required for the app runtime):
- `IMPROVMX_API_KEY` — ImprovMX API for inbound alias/DNS verify ([inbox setup](docs/inbox-improvmx-namecheap.md))

Optional (campaign outreach):
- `CAMPAIGN_SENDER_NAME` — e.g. `Jeremy` for outreach From line and `{senderIntro}`
- `CAMPAIGN_OUTREACH_SECRET` — bearer token for local `outreach/` CLI → `POST /api/campaigns/send` (set on Vercel too for prod sends)

Local outreach: `outreach/` discovery worker pushes to `campaign_prospects` via `POST /api/campaigns/prospects` + `CAMPAIGN_OUTREACH_SECRET`. Admin **Campaigns → Queue** approves/sends. See [docs/outreach-project.md](docs/outreach-project.md).

## Architecture

**Next.js 16 App Router** — `params` and `searchParams` in page components are Promises and must be awaited.

### Data flow
- Search → `lib/search.ts:getMergedResults` — curated/manual businesses from Neon only (no external listing API), capped at `MAX_RESULTS`
- Curated businesses (admin-added pros; legacy `source = 'yelp'` rows render from stored data) → `lib/kv.ts` → Neon `curated_businesses` table
- Manual photo uploads → Cloudflare R2 bucket `quickprolist-photos` (public)
- Starred favorites → browser `localStorage` only, no backend
- User flows (one doc per flow) → [docs/flows/README.md](docs/flows/README.md) (enroll, trial expiration, campaigns, dashboard flag)

### Key files
- `lib/search.ts` — `getMergedResults(where, category)` — curated lookup across the opened towns
- `lib/business.ts` — shared `Business` type (`source: 'yelp' | 'manual'`; `'yelp'` only on legacy rows)
- `lib/kv.ts` — `getCurated`, `addCuratedManual`, `removeCurated`, `listAllCurated`, `uploadBusinessPhoto`, `normalizeCity`
- `lib/categories.ts` — category definitions
- `app/api/search/route.ts` — proxies merged search results
- `app/api/curated/route.ts` — GET (list/filter), POST (add manual pro; admin auth), DELETE (Bearer auth)
- `app/api/curated/photo/route.ts` — multipart upload to R2 (Bearer auth)
- `app/admin/page.tsx` — tabbed UI: curated list w/ remove, manual-add modal, invitations, reports
- `components/BusinessModal.tsx` — `ManualBusinessModal` and `EditManualBusinessModal`
- `components/BusinessCard.tsx` — shared card; no ratings shown

### Curation
Admin adds pros per (category, city). User searches return up to `MAX_RESULTS` pros from Neon only. Cities are normalized to the lowercase first segment (e.g. "Marietta, GA" → "marietta"); category and city matching is case-insensitive and trimmed. Without `DATABASE_URL`, `getCurated` returns empty and search shows the "No pros found here yet" empty state.

### localStorage schema
```json
{ "starred": { "<business-id>": { /* Business object */ } } }
```
