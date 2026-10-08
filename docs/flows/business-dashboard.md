# Flow: Business dashboard (`/dashboard/[token]`)

Subscribed (or trial) business opens a **secret link** to view lifetime stats and edit limited listing fields. There is **no** separate business login — the URL token is the credential.

---

## URL

`/dashboard/[token]` — `app/dashboard/[token]/page.tsx`

---

## Access

`getCuratedByDashboardToken(token)` (`lib/kv.ts`). Unknown token → Next.js `notFound()`.

---

## What the user sees

1. Header: business name + status badge from `deriveStatus` (`lib/reports.ts`) using invitation rows for that `curated_business_id`.
2. **Lifetime stats** (from curated row counters): search appearances, profile views, phone clicks, website clicks, directions clicks.
3. **Edit your listing** — `components/DashboardEditForm.tsx`:
   - Editable: website URL, contact email, review URL.
   - Saves via `PATCH /api/dashboard/[token]` (token in path only; no session).
   - Copy states name/category/cities are admin-managed.

---

## Billing portal API (no dashboard button in current UI)

`POST /api/stripe/portal` with `{ token }` returns Stripe Billing Portal URL when the business has a **paid** invitation with `stripe_subscription_id` (`app/api/stripe/portal/route.ts`).

`app/dashboard/[token]/page.tsx` does **not** call this endpoint in the codebase reviewed for this doc — integration would be client-side if added later.

---

## How businesses get the link

- Transactional email after checkout (`app/api/stripe/webhook/route.ts`) includes dashboard URL.
- Admin **Copy dashboard link** on pinned pro (`app/admin/AdminClient.tsx` → `handleCopyDashboardLink`).

---

## Key files

`app/dashboard/[token]/page.tsx`, `app/api/dashboard/[token]/route.ts`, `components/DashboardEditForm.tsx`, `lib/kv.ts`, `lib/reports.ts`.
