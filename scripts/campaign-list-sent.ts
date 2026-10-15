/**
 * List campaign sends from docs/campaigns/sent-registry.json
 * Usage: npx tsx scripts/campaign-list-sent.ts [--json]
 */
import { loadSentRegistry, findSentByEmail } from '../lib/campaign-sent-registry'

const emailArg = process.argv.find((a) => a.startsWith('--email='))?.slice('--email='.length)
const asJson = process.argv.includes('--json')

if (emailArg) {
  const hit = findSentByEmail(emailArg)
  console.log(hit ? JSON.stringify(hit, null, 2) : 'NOT_SENT')
  process.exit(hit ? 0 : 1)
}

const reg = loadSentRegistry()
if (asJson) {
  console.log(JSON.stringify(reg, null, 2))
  process.exit(0)
}

console.log(`Campaign sends: ${reg.sent.length} (see docs/campaigns/sent-registry.json)\n`)
for (const row of reg.sent) {
  console.log(`${row.sentAt.slice(0, 10)}  ${row.email}  ${row.businessName}  batch=${row.batch}`)
}
