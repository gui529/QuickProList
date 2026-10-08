# Flow: Admin — Listing requests

Admin reviews inbound “get listed” form submissions from the homepage.

---

## Entry

`/admin?tab=requests` — `RequestsTab` in `AdminClient`.

---

## Data

`GET /api/list-business` (admin session required) → `listListingRequests()` (`lib/listing-requests.ts`).

Displays table of submissions created by [list-business-lead.md](./list-business-lead.md).

---

## Key files

`components/RequestsTab.tsx`, `app/api/list-business/route.ts`, `lib/listing-requests.ts`.
