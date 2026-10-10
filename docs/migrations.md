# Database migrations

SQL lives in `migrations/` (sorted by `000_`, `001_`, …). Dependency order is enforced by `migrations/order.test.ts`.

## Automatic runs (Vercel)

`npm run build` runs **`npm run migrate`** first. Each deployment uses that environment’s `DATABASE_URL`:

| Deploy | Database |
|--------|----------|
| Preview branch `dev` | Neon **dev** |
| Production (`main`) | Neon **production** |

When you merge **`dev` → `main`**, production build applies any migration files that are not yet recorded in `schema_migrations`.

## One-time baseline (existing databases)

If the database was migrated **manually** before the runner existed, do **not** re-run old files. Mark them as already applied:

```bash
# With DATABASE_URL pointing at that branch (dev or production):
npm run migrate:baseline
```

Then `npm run migrate` only applies **new** files (e.g. `020_…`, `021_…`).

## Commands

```bash
npm run migrate          # apply pending migrations
npm run migrate:baseline # mark all current files applied (no SQL)
npm run migrate:status   # show applied vs pending
```

If `DATABASE_URL` is unset, migrate is skipped (build still continues).

## Adding a migration

1. Add `migrations/0NN_description.sql` with a new number prefix.
2. Prefer idempotent SQL (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
3. Run `npm run test` (includes migration order test).
4. Push to `dev`; preview deploy migrates dev. Merge to `main` when ready for production.
