/**
 * Insert manual curated pros from JSON and set image_url (website logo → R2 or category stock).
 * Usage: npx tsx scripts/seed-curated-pros.ts [path/to/pros.json] [--dry-run]
 *
 * See docs/dev-seed-pros.md and data/dev-seed-pros.example.json.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnvLocal } from './load-env-local'
import { normalizeCategory } from '../lib/categories'
import { normalizeCity } from '../lib/kv'

loadEnvLocal()

interface SeedPro {
  category: string
  cities: string[]
  name: string
  phone?: string
  address?: string
  websiteUrl?: string
  reviewUrl?: string
  /** When true, row is visible in homeowner search immediately (default true). */
  published?: boolean
}

interface SeedFile {
  pros: SeedPro[]
}

const args = process.argv.slice(2).filter((a) => a !== '--dry-run')
const dryRun = process.argv.includes('--dry-run')
const jsonPath = resolve(process.cwd(), args[0] ?? 'data/dev-seed-pros.example.json')

async function main() {
  const { query } = await import('../lib/db')
  const { ensureCuratedBusinessImage } = await import('../lib/curated-image')

  const data = JSON.parse(readFileSync(jsonPath, 'utf8')) as SeedFile
  if (!Array.isArray(data.pros) || data.pros.length === 0) {
    console.error('JSON must contain a non-empty "pros" array.')
    process.exit(1)
  }

  let inserted = 0
  let imaged = 0

  for (const pro of data.pros) {
    const category = normalizeCategory(pro.category)
    const cities = pro.cities.map(normalizeCity).filter(Boolean)
    if (!pro.name?.trim() || cities.length === 0) {
      console.error(`Skip invalid row: ${JSON.stringify(pro)}`)
      continue
    }

    const published = pro.published !== false
    const isDraft = !published

    const existing = await query<{ id: string }>(
      `SELECT id FROM curated_businesses
       WHERE lower(trim(name)) = lower(trim($1)) AND category = $2 AND delisted_at IS NULL
       LIMIT 1`,
      [pro.name.trim(), category]
    )

    let id = existing[0]?.id
    if (!id) {
      if (dryRun) {
        console.log(`DRY INSERT ${pro.name} (${category})`)
        continue
      }
      const rows = await query<{ id: string }>(
        `INSERT INTO curated_businesses (
           source, category, cities, name, phone, address, website_url, review_url, is_draft, is_trial
         ) VALUES ('manual', $1, $2, $3, $4, $5, $6, $7, $8, FALSE)
         RETURNING id`,
        [
          category,
          cities,
          pro.name.trim(),
          pro.phone?.trim() || null,
          pro.address?.trim() || null,
          pro.websiteUrl?.trim() || null,
          pro.reviewUrl?.trim() || null,
          isDraft,
        ]
      )
      id = rows[0]?.id
      if (!id) {
        console.error(`Insert failed: ${pro.name}`)
        continue
      }
      inserted++
      console.log(`INSERT ${pro.name}`)
    } else {
      console.log(`EXISTS ${pro.name}`)
    }

    const { imageUrl, source } = await ensureCuratedBusinessImage(id, { dryRun })
    if (source !== 'existing' && source !== 'skipped' && imageUrl) {
      imaged++
      console.log(`  image [${source}]`)
    } else if (source === 'existing') {
      console.log(`  image (already set)`)
    } else if (source === 'skipped') {
      console.log(`  image (none found)`)
    }

    await new Promise((r) => setTimeout(r, 400))
  }

  console.log(`\nDone. ${inserted} inserted, ${imaged} image(s) set. JSON: ${jsonPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
