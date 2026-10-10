# Outreach architecture

Two processes, one database table.

## 1. App (deployed) — review & send

**Admin → Campaigns → Queue** reads `campaign_prospects` in Neon.

- Approve / reject / send email
- Sends use existing `POST /api/campaigns/send` pipeline (Resend, enroll links, `campaign_contacts`)

API (admin session):

- `GET /api/campaigns/prospects`
- `POST /api/campaigns/prospects/:id/approve|reject|send`

## 2. Discovery worker (local, separate) — fill rows

**`outreach/`** is not deployed. It runs Cursor CLI (or Serper) and **inserts** prospects via:

- `POST /api/campaigns/prospects` with `Authorization: Bearer $CAMPAIGN_OUTREACH_SECRET`

```bash
cd outreach
npm run find -- --city "Marietta, GA" --category plumbing
```

Optional local UI: `npm run dashboard` — **Find pros** only (pushes to the same API).

## Database

Run migration `migrations/019_campaign_prospects.sql` on Neon.

| Column | Purpose |
|--------|---------|
| `business_name`, `email`, `phone`, `website` | Prospect |
| `category`, `city` | Trade + town |
| `status` | `pending_review` → `approved` → `sent` (or `rejected` / `failed`) |
| `discovery_notes`, `search_query` | From AI worker |
| `error_message`, `sent_at` | Send outcome |

Duplicate active emails are blocked by a partial unique index.

Setup details: [outreach/README.md](../outreach/README.md)
