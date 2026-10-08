# Flow: Admin — Reports

Admin views aggregated business/report data for curated listings.

---

## Entry

`/admin?tab=reports` — `ReportsTab` in `AdminClient`.

---

## Data

Client fetches `GET /api/reports` (admin auth in route) — see `components/ReportsTab.tsx` and `lib/reports.ts` for fields shown (status, impressions, trial/paid state, etc.).

Used internally by win-back job (`lib/winback.ts` → `getBusinessReports`) to find `expired-trial` businesses.

---

## Key files

`components/ReportsTab.tsx`, `app/api/reports/route.ts`, `lib/reports.ts`.
