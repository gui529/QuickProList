/**
 * Pull published curated_businesses into docs/campaigns/prospects-registry.json (Wave 1).
 * Local: requires DATABASE_URL. Cloud automation: use Neon MCP + neon-mcp.md instead.
 *
 *   npx tsx scripts/campaign-sync-listed-prospects.ts
 *   npx tsx scripts/campaign-sync-listed-prospects.ts --dry-run
 */
import { loadCampaignEnv } from './load-campaign-env'
import { isDatabaseConfigured, query } from '../lib/db'
import {
  loadProspectRegistry,
  mergeCuratedProspects,
  saveProspectRegistry,
  type CuratedProspectRow,
} from '../lib/campaign-prospect-registry'

loadCampaignEnv()

const dryRun = process.argv.includes('--dry-run')

async function main() {
  if (!isDatabaseConfigured()) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const rows = await query<CuratedProspectRow>(
    `SELECT id, name, category, cities, contact_email, website_url
     FROM curated_businesses
     WHERE is_draft = false AND delisted_at IS NULL
     ORDER BY category, name`
  )

  const existing = loadProspectRegistry()
  const prospects = mergeCuratedProspects(existing.prospects, rows)
  const payload = {
    version: 1 as const,
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

  saveProspectRegistry(payload)
  console.log(`Wrote ${prospects.length} prospects to docs/campaigns/prospects-registry.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
