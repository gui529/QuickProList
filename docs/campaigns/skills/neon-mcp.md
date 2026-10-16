# Neon MCP (campaign-manager — production DB)

**Cloud campaign uses Neon MCP**, not `DATABASE_URL` on the automation. Connect **Neon MCP** on Campaign Loop (production QuickProList project / default branch).

Local scripts (`campaign-sync-listed-prospects.ts`) may still use `DATABASE_URL` from `.env.local`; scheduled ticks use MCP only.

---

## Each tick (priority stack step 1 + safety)

### 1. Paying subscribers → board metrics

Run via **Neon MCP `run_sql`** (read-only). Canonical SQL: `lib/campaign-neon-queries.ts` → `SQL_PAYING_SUBSCRIBER_COUNT`.

Write result to **`board.md`** → **Metrics snapshot** → `Paying subscribers (prod)` with today’s date (ET).

### 2. Before each `--prepare` (suppression)

If the recipient email is known, run `sqlEmailSuppressedCheck(normalizeEmail)` from `lib/campaign-neon-queries.ts` (after `normalizeEmail` from `lib/suppressions.ts`).

If a row returns, **do not send** — mark prospect `skip` with reason `suppressed`, log on board.

### 3. Optional: refresh Wave 1 from live listings (weekly or when registry stale)

When owner focus is listed pros and registry may be behind prod:

SQL: `SQL_LISTED_CURATED_PROSPECTS` in `lib/campaign-neon-queries.ts`.

Merge into **`prospects-registry.json`** (same shape as `campaign-sync-listed-prospects.ts`):

- `source: "curated"`, `curatedId` = `id`
- `city` = first element of `cities` or `atlanta`
- `status` = `pending` if `contact_email` set, else `needs_email`
- **Do not** wipe `sent` rows or discovery-only prospects; upsert by `curatedId` / business name

Prefer **discovery + registry** between full syncs.

---

## Do not

- Put **`DATABASE_URL`** on Cursor automation (use MCP).
- Run destructive SQL without owner approval.
- Log full connection strings or PII in board commits.

---

## Failure

If Neon MCP is unavailable, log one line on board and continue outreach (JSON registries). Do not block sends solely for missing revenue count.
