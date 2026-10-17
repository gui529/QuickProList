/**
 * Refuse an address that already appears in Resend history or the Gmail test log.
 *
 *   npx tsx scripts/campaign-check-sent.ts --email=pro@example.com --business "Acme Plumbing"
 *   npx tsx scripts/campaign-check-sent.ts --record --email=pro@example.com --business "Acme Plumbing" --gmail-id <id>
 */
import { loadContactHistory, priorContactMessage, recordGmailSend, findPriorContact } from '../lib/campaign-contact-history'

function arg(name: string): string | undefined {
  const eq = process.argv.find((item) => item.startsWith(`${name}=`))
  if (eq) return eq.slice(name.length + 1)
  const i = process.argv.indexOf(name)
  if (i === -1 || i + 1 >= process.argv.length) return undefined
  return process.argv[i + 1]
}

const email = arg('--email')
const business = arg('--business') ?? ''
const record = process.argv.includes('--record')
const force = process.argv.includes('--force')
const gmailId = arg('--gmail-id')
const city = arg('--city')
const category = arg('--category')

if (!email) {
  console.error(
    'Usage: npx tsx scripts/campaign-check-sent.ts --email=<email> [--business "<name>"] [--record --gmail-id <id>] [--force]'
  )
  process.exit(1)
}

if (!business.trim()) {
  console.error('Pass --business "<name>" so the same domain and business are blocked too. Checking the address only.')
}

const history = loadContactHistory()
const prior = findPriorContact(email, business, history)
if (prior && !(record && force)) {
  console.error(priorContactMessage(email, prior))
  process.exit(1)
}

if (!record) {
  console.log(`OK not previously contacted: ${email}`)
  process.exit(0)
}

if (!business.trim() || !gmailId) {
  console.error('--record requires --business "<name>" and --gmail-id <id>')
  process.exit(1)
}

const row = recordGmailSend(
  {
    email,
    businessName: business,
    sentAtEt: '',
    gmailMessageId: gmailId,
    ...(city ? { city } : {}),
    ...(category ? { category } : {}),
  },
  { force }
)
console.log(JSON.stringify({ recorded: true, ...row }))
