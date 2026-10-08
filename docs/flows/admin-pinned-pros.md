# Flow: Admin — Pinned pros (curate listings)

Default admin tab: manage businesses in `curated_businesses` (list, add, edit, remove, ProSite toggle, dashboard/enrollment actions).

---

## Entry

`/admin` (no `tab` query, or tab other than `invitations` | `reports` | `requests`) — `app/admin/AdminClient.tsx`.

Sidebar: **Pinned Pros** → `/admin` (`components/AdminSidebar.tsx`).

---

## Load data

On mount: `GET /api/curated` → `businesses` array shown as cards (`BusinessCard` in admin context).

---

## Actions (from UI)

| Action | Behavior |
|--------|----------|
| **Add manually** | `ManualBusinessModal` → `POST /api/curated` (admin auth) |
| **Edit** | `EditManualBusinessModal` → update curated row |
| **Remove** | Confirm → `DELETE /api/curated?id=` |
| **Copy dashboard link** | Copies URL with `dashboardToken` from business row |
| **Enrollment link** | Opens `EnrollmentLinkModal` → [admin-invitations-and-trials.md](./admin-invitations-and-trials.md) |
| **Start trial** | `TrialModal` → `POST /api/invitations` with `isTrial: true` |
| **Share link** | `ShareLinkModal` → copy `/?location=&category=&highlight=` URL |
| **Review link** | `ReviewLinkModal` (review URL on listing) |
| **More menu** | ProSite toggle and other row actions (`data-pro-more-menu` in `AdminClient`) |

Draft listings (`is_draft`) are managed in this area; search uses `getCurated` which excludes drafts (`lib/kv.ts`).

---

## Key files

`app/admin/AdminClient.tsx`, `app/api/curated/route.ts`, `app/api/curated/photo/route.ts`, `components/BusinessModal.tsx`, `lib/kv.ts`.
