/**
 * Append one prospect to docs/campaigns/prospects-registry.json.
 * Validates the address, requires an MX record, and refuses registry or send-history duplicates.
 *
 *   npx tsx scripts/campaign-add-prospect.ts \
 *     --business "Acme Plumbing" --email owner@acme.example --city marietta \
 *     --category plumbing --source-url https://acme.example/contact --source own_site
 */
import { loadCampaignEnv } from './load-campaign-env'
import { assertRecipientDomainHasMx, CampaignPrepareError } from '../lib/campaign-prepare'
import { loadContactHistory } from '../lib/campaign-contact-history'
import {
  addProspectToRegistry,
  loadProspectRegistry,
  saveProspectRegistry,
} from '../lib/campaign-prospect-registry'
import { isRoleAddress } from '../lib/gmail-campaign'
import { ALLOWED_PROSPECT_SOURCES, isAllowedProspectSource } from '../lib/prospect-sources'

loadCampaignEnv()

function arg(name: string): string | undefined {
  const eq = process.argv.find((item) => item.startsWith(`${name}=`))
  if (eq) return eq.slice(name.length + 1)
  const i = process.argv.indexOf(name)
  if (i === -1 || i + 1 >= process.argv.length) return undefined
  return process.argv[i + 1]
}

const business = arg('--business')
const email = arg('--email')
const city = arg('--city')
const category = arg('--category')
const sourceUrl = arg('--source-url')
const website = arg('--website')
const source = arg('--source')

if (!business || !email || !city || !category || !sourceUrl || !isAllowedProspectSource(source)) {
  console.error(
    `Usage: npx tsx scripts/campaign-add-prospect.ts --business "<name>" --email <email> --city <slug> --category <slug> --source-url <url> --source <${ALLOWED_PROSPECT_SOURCES.join('|')}> [--website <url>]`
  )
  console.error('Prospect source is required. Yelp is not allowed. See docs/prospect-sources.md.')
  process.exit(1)
}

async function main() {
  try {
    await assertRecipientDomainHasMx(email!)
  } catch (err) {
    if (err instanceof CampaignPrepareError) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }

  const registry = loadProspectRegistry()
  const prospect = addProspectToRegistry(
    registry,
    {
      businessName: business!,
      email: email!,
      city: city!,
      category: category!,
      sourceUrl: sourceUrl!,
      websiteUrl: website,
      source,
    },
    { history: loadContactHistory() }
  )
  saveProspectRegistry(registry)
  if (isRoleAddress(email!)) {
    console.error(
      `Flagged role address ${email}. It was added as pending but the Gmail batch keeps role mailboxes out of sendReady.`
    )
  }
  console.log(JSON.stringify(prospect, null, 2))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
