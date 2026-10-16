/**
 * Pull published curated_businesses into docs/campaigns/prospects-registry.json (Wave 1).
 * Local: requires DATABASE_URL. Cloud automation: use Neon MCP + neon-mcp.md instead.
 *
 *   npx tsx scripts/campaign-sync-listed-prospects.ts
 *   npx tsx scripts/campaign-sync-listed-prospects.ts --dry-run
 */
import { writeFileSync } from 'fs'
import { join } from 'path'
import { loadCampaignEnv } from './load-campaign-env'
import { isDatabaseConfigured, query } from '../lib/db'

loadCampaignEnv()

const dryRun = process.argv.includes('--dry-run')
const registryPath = join(process.cwd(), 'docs/campaigns/prospects-registry.json')

interface Row {
  id: string
  name: string
  category: string
  cities: string[]
  contact_email: string | null
  website_url: string | null
}

async function main() {
  if (!isDatabaseConfigured()) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const rows = await query<Row>(
    `SELECT id, name, category, cities, contact_email, website_url
     FROM curated_businesses
     WHERE is_draft = false AND delisted_at IS NULL
     ORDER BY category, name`
  )

  const prospects = rows.map((r) => {
    const city = r.cities[0] ?? 'atlanta'
    const email = r.contact_email?.trim().toLowerCase() || null
    return {
      businessName: r.name,
      email,
      city,
      category: r.category,
      source: 'curated' as const,
      status: email ? 'pending' : 'needs_email',
      curatedId: r.id,
      websiteUrl: r.website_url,
    }
  })

  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    prospects,
  }

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2))
    console.log(
      `Summary: ${prospects.length} listed; ${prospects.filter((p) => p.email).length} with email; ${prospects.filter((p) => !p.email).length} need discovery`
    )
    return
  }

  writeFileSync(registryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${prospects.length} prospects to ${registryPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
