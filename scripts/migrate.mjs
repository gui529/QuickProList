/**
 * Apply pending SQL files from migrations/ in alphabetical order.
 * Records applied files in schema_migrations.
 *
 * Usage:
 *   node scripts/migrate.mjs              # apply pending
 *   node scripts/migrate.mjs --baseline   # mark all files applied without running (existing DBs)
 *   node scripts/migrate.mjs --status       # list applied / pending
 *
 * Skips when DATABASE_URL is unset (e.g. CI without a database).
 */
import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations')
const ENV_LOCAL = path.join(__dirname, '..', '.env.local')

function loadEnvLocal() {
  if (!fs.existsSync(ENV_LOCAL)) return
  for (const line of fs.readFileSync(ENV_LOCAL, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    if (process.env[key]) continue
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

loadEnvLocal()

const args = new Set(process.argv.slice(2))
const baseline = args.has('--baseline')
const statusOnly = args.has('--status')

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

function splitStatements(sql) {
  const withoutComments = sql.replace(/--.*$/gm, '')
  return withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

async function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  const sql = neon(url)
  return async (text, params = []) => sql.query(text, params)
}

async function ensureMigrationsTable(query) {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function loadApplied(query) {
  const rows = await query(`SELECT filename FROM schema_migrations ORDER BY filename`)
  return new Set(rows.map((r) => r.filename))
}

async function markApplied(query, filename) {
  await query(
    `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING`,
    [filename]
  )
}

async function main() {
  const query = await getSql()
  if (!query) {
    console.log('migrate: DATABASE_URL not set — skipping')
    return
  }

  const files = listMigrationFiles()
  if (!files.length) {
    console.log('migrate: no migration files found')
    return
  }

  await ensureMigrationsTable(query)
  const applied = await loadApplied(query)
  const pending = files.filter((f) => !applied.has(f))

  if (statusOnly) {
    console.log(`migrate: ${applied.size} applied, ${pending.length} pending`)
    for (const f of files) {
      console.log(`  ${applied.has(f) ? '✓' : '·'} ${f}`)
    }
    return
  }

  if (baseline) {
    for (const f of files) {
      await markApplied(query, f)
    }
    console.log(`migrate: baselined ${files.length} migration(s) (no SQL executed)`)
    return
  }

  if (!pending.length) {
    console.log(`migrate: up to date (${files.length} file(s))`)
    return
  }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    const statements = splitStatements(sql)
    console.log(`migrate: applying ${file} (${statements.length} statement(s))`)
    for (const statement of statements) {
      await query(statement)
    }
    await markApplied(query, file)
  }

  console.log(`migrate: applied ${pending.length} file(s)`)
}

main().catch((err) => {
  console.error('migrate failed:', err)
  process.exit(1)
})
