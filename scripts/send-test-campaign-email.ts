/**
 * One-off: send a campaign-style marketing email using lib/email.ts.
 * Usage: npx tsx scripts/send-test-campaign-email.ts <to> [businessName]
 * Loads .env.local from repo root.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  let val = trimmed.slice(eq + 1).trim()
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1)
  }
  if (!process.env[key]) process.env[key] = val
}
if (!process.env.UNSUBSCRIBE_SECRET && process.env.QA_ADMIN_SECRET) {
  process.env.UNSUBSCRIBE_SECRET = process.env.QA_ADMIN_SECRET
}

async function main() {
  const to = process.argv[2]
  const businessName = process.argv[3] ?? "Gui's Demo Plumbing"
  if (!to?.includes('@')) {
    console.error('Usage: npx tsx scripts/send-test-campaign-email.ts <email> [businessName]')
    process.exit(1)
  }

  const city = 'Marietta, GA'
  const category = 'plumbing'

  const { expandCampaignMessage, DEFAULT_MESSAGE } = await import('../lib/campaigns')
  const { createInvitation } = await import('../lib/invitations')
  const { sendEmail } = await import('../lib/email')
  const { isSuppressed, normalizeEmail } = await import('../lib/suppressions')

  if (await isSuppressed('email', normalizeEmail(to))) {
    console.error('Recipient is suppressed; remove from suppressions before sending.')
    process.exit(1)
  }

  const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')
  const token = await createInvitation({
    businessName,
    category,
    cities: [city],
    monthlyPrice: 29.99,
  })
  const enrollUrl = `${siteUrl}/enroll/${token}`
  const body = expandCampaignMessage(DEFAULT_MESSAGE, { businessName, city, category })

  const id = await sendEmail(to, businessName, body, { city, category, enrollUrl })
  console.log('Campaign test email sent. Resend id:', id)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
