# Dev database plan

Production and the dev site use separate Neon branches of Project Alpha.

| Where the app runs | Neon branch | Vercel env |
|---|---|---|
| https://www.quickprolist.com | `production` (`br-restless-waterfall-b49bwrif`) | Production `DATABASE_URL` |
| https://home-help-git-dev-gui-costas-projects.vercel.app and local `npm run dev` | `dev` (`br-autumn-sun-b4jffz37`), copied from production | Preview (`dev`) and Development `DATABASE_URL` |

## Done

- [x] Create the `dev` branch from `production`. Production data was not changed.
- [x] A row inserted only on `dev` showed up on the dev site and did not show up on production. The row was then removed.
- [x] Local `.env.local` points at the `dev` branch.
- [x] Redeploy the dev preview so it uses the new `DATABASE_URL`.

Photos stay in the shared R2 bucket `quickprolist-photos`.

To add real pros for tryouts (with profile images), see [dev-seed-pros.md](./dev-seed-pros.md).

## Later

- Schema changes go on the `dev` branch first; add a file under `migrations/` and push — **dev preview deploy runs new SQL automatically** (see [migrations.md](./migrations.md)).
- Merge `dev` → `main` to run the same pending migrations on **production** during the production build.
- One-time on each existing branch: `npm run migrate:baseline` with that branch’s `DATABASE_URL` if the schema was applied manually before the runner existed.
- Reset the `dev` branch from `production` when it should be a fresh copy of live data (re-baseline or empty `schema_migrations` on the reset branch).
