# Flow: Homeowner search for pros

Visitor uses the **home page** (`/`) to pick an opened town and a service category, then sees up to three curated businesses.

There is **no** account sign-in for homeowners in the current app.

---

## Pages & routes

| URL | Behavior |
|-----|----------|
| `/` | Main search UI (`app/page.tsx`) |
| `/search?...` | Redirects to `/` with same query (`app/search/page.tsx`) |

---

## Steps

### 1. Land on `/`

Hero: town input (`components/OpenTownInput.tsx`) + category grid (`lib/categories.ts`).

### 2. Choose town

- Town must match `lib/open-towns.ts` → `resolveOpenTown` (opened GA towns list).
- Invalid / outside list → error `NOT_OPEN_MESSAGE` (no API call).
- Valid town is saved to `localStorage` key `quickprolist:lastLocation` (`app/page.tsx`).

### 3. Choose category

- If town empty → message to choose town first; focus town input.
- If town set → `runSearch(category, town)` runs.

### 4. Search request

`GET /api/search?category={value}&location={town}`

- Rate limit: `search:{ip}` — default **120 requests / minute / IP** (`searchRateLimitMax()` in `lib/rate-limit.ts`; override `SEARCH_RATE_LIMIT_PER_MINUTE`). Requests with no identifiable IP are not bucketed together.
- Server uses `getMergedResults` (`lib/search.ts`) — **Neon `curated_businesses` only** (no external listing API).
- Results capped at `MAX_RESULTS` (3) in `lib/search.ts`; home UI also `.slice(0, 3)` on the client response.

### 5. Results UI

- Up to **3** `BusinessCard` components (`components/BusinessCard.tsx`).
- Optional `highlight` query param: one card gets “This is your listing” + `highlighted` styling (used with admin **Share link**).
- Empty results → “No pros found here yet. Check back soon.”

### 6. Actions on a card (in code today)

- Phone / website: `TrackedContactLink` → navigates + `POST /api/pro/[id]/click` with `{ type: 'phone' | 'website' }` (fire-and-forget).
- **See reviews** — external `reviewUrl` when present.
- **ProSite** — `/pro/{id}` in new tab when `business.proSiteEnabled` is true.

No favorite/star UI appears in `app/page.tsx` or `BusinessCard.tsx` in the current codebase.

### 7. URL sharing

`window.history.replaceState` updates URL to `/?location=...&category=...` (and optional `highlight`) without full navigation.

On load, if `location` + `category` query params are present, search auto-runs once.

---

## Same page: business lead form

Bottom of `/`: `ListBusinessSection` → [list-business-lead.md](./list-business-lead.md).

---

## Key files

`app/page.tsx`, `app/api/search/route.ts`, `lib/search.ts`, `lib/open-towns.ts`, `components/BusinessCard.tsx`, `components/TrackedContactLink.tsx`, `app/api/pro/[id]/click/route.ts`.
