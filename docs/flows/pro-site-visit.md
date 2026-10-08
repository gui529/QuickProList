# Flow: Visit public ProSite (`/pro/[id]`)

Visitor opens a business’s marketing page when that business has ProSite enabled.

---

## URL

`/pro/[id]` — `app/pro/[id]/page.tsx`

---

## Access rules (code)

1. `getCuratedById(id)` (`lib/kv.ts`).
2. `toPublicBusiness` (`lib/public-business.ts`).
3. Page renders only if business exists and **`proSiteEnabled`** is true; otherwise `notFound()`.

---

## Steps (visitor)

1. Page loads; `incrementProfileView(biz.id)` runs fire-and-forget (`lib/kv.ts`).
2. Hero, photos, service area, contact actions (phone, website, directions via Google Maps query on `address`, review link when `reviewUrl` set).
3. Contact links use `TrackedContactLink` where applicable → `POST /api/pro/[id]/click` with `phone`, `website`, or `directions` (`components/TrackedContactLink.tsx`).

---

## How visitors reach ProSite

From search results: **ProSite** chip on `BusinessCard` when `proSiteEnabled` (`components/BusinessCard.tsx`).

Admin can toggle ProSite per pinned pro (admin UI → `PATCH` curated / related API — see [admin-pinned-pros.md](./admin-pinned-pros.md)).

---

## Key files

`app/pro/[id]/page.tsx`, `lib/kv.ts`, `components/TrackedContactLink.tsx`, `app/api/pro/[id]/click/route.ts`.
