import { loadEnv } from './env.ts'
import { discoverProspectsInArea, resolveDiscoveryTrade } from './discovery.ts'
import { pushProspectsToApp } from './push-via-app.ts'

loadEnv()

const [, , command, ...args] = process.argv

function flag(name: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  if (i === -1) return undefined
  return args[i + 1]
}

function usage() {
  console.log(`
QuickProList Outreach CLI — queue in data/queue.json

  npm run find -- --city "Marietta, GA" --category plumbing
  Review queue in Admin → Campaigns → Queue (production app).
`)
}

async function cmdFind() {
  const city = flag('city')
  const category = flag('category') ?? 'plumbing'
  if (!city) {
    console.error('Missing --city "Marietta, GA"')
    process.exit(1)
  }
  const trade = resolveDiscoveryTrade(category)
  const discovery = await discoverProspectsInArea(city, trade.value)
  const { prospects, query } = discovery
  const warning = 'warning' in discovery ? discovery.warning : undefined

  if (prospects.length === 0) {
    console.log(`Query: ${query}\nNo prospects to push.`)
    if (warning) console.warn(warning)
    return
  }

  const push = await pushProspectsToApp(
    prospects.map((p) => ({
      businessName: p.businessName,
      email: p.email,
      phone: p.phone,
      website: p.website,
      category: trade.value,
      city,
      discoveryNotes: p.notes,
      searchQuery: query,
    }))
  )
  console.log(`\nQuery: ${query}`)
  console.log(`Pushed ${push.added ?? 0} to API · skipped ${push.skipped ?? 0}`)
  if (warning) console.warn(warning)
  console.log('Open Admin → Campaigns → Queue to approve and send.')
}

async function main() {
  if (!command) {
    usage()
    return
  }
  switch (command) {
    case 'find':
      await cmdFind()
      break
    default:
      usage()
      process.exit(1)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
