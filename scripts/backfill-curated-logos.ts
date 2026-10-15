/**
 * Backfill curated_businesses.image_url from website logos (R2) or category stock photos.
 * Usage: npx tsx scripts/backfill-curated-logos.ts [--dry-run]
 */
import { loadEnvLocal } from './load-env-local'

loadEnvLocal()

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const { query } = await import('../lib/db')
  const { ensureCuratedBusinessImage } = await import('../lib/curated-image')

  const rows = await query<{ id: string; name: string }>(
    `SELECT id, name FROM curated_businesses
     WHERE delisted_at IS NULL AND COALESCE(is_draft, FALSE) = FALSE
     ORDER BY category, name`
  )

  let updated = 0
  for (const row of rows) {
    const { imageUrl, source } = await ensureCuratedBusinessImage(row.id, { dryRun })
    if (source === 'existing') {
      console.log(`OK   ${row.name} (unchanged)`)
    } else if (source === 'skipped' || !imageUrl) {
      console.log(`SKIP ${row.name} — no image`)
    } else {
      console.log(`${dryRun ? 'DRY' : 'SET'} ${row.name} [${source}]`)
      updated++
    }
    await new Promise((r) => setTimeout(r, 400))
  }

  console.log(`\nDone. ${updated} row(s) ${dryRun ? 'would be ' : ''}updated.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
