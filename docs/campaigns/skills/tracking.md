# Outreach tracking (campaign-manager)

## Canonical sent log — do not double-email

**File:** `docs/campaigns/sent-registry.json`

- **One row per recipient email** (ever, unless owner uses `--force`).
- Updated **automatically** when `campaign-manager-send.ts` succeeds.
- **Read before every batch** — never send blind.

```bash
npx tsx scripts/campaign-list-sent.ts
npx tsx scripts/campaign-list-sent.ts --email=pro@example.com
npx tsx scripts/campaign-list-sent.ts --json
```

Send script **blocks** duplicates:

```text
{"error":"already_sent","email":"...","sentAt":"...","batch":"...","resendId":"..."}
```

Override only with `--force` (log why on the board).

## Prospect pipeline

**File:** `docs/campaigns/prospects-registry.json`

Track companies you plan to mail or have listed on the site:

| Field | Purpose |
|-------|---------|
| `businessName`, `email`, `city`, `category` | Who |
| `source` | `curated` \| `discovery` \| `manual` |
| `status` | `needs_email` → `pending` → `sent` → `replied` → `subscribed` \| `declined` \| `skip` |
| `emailSource` | Where the address was verified (URL + date) |
| `skipReason` | Why no send after discovery attempts |
| `curatedId` | Optional UUID from Neon |

**Agent:** refresh from admin/Neon at session start for Wave 1; set `status: sent` when registry gains that email.

Example prospect row:

```json
{
  "businessName": "Acme Plumbing",
  "email": "owner@acmeplumbing.com",
  "city": "marietta",
  "category": "plumbing",
  "source": "curated",
  "status": "pending",
  "curatedId": "optional-uuid"
}
```

## Board (`board.md`)

Session narrative + **summary** tables. **Registry JSON wins** for dedupe; mirror highlights on the board Sent log when useful.

## Lessons (`lessons.json`)

Operational memory across days — only what improves **paid subscribers** (see
`subscriberImpact` in each row). See `docs/campaigns/skills/lessons.md`. Not a
substitute for `sent-registry.json` (who was mailed).
