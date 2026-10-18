/**
 * Campaign copy preview. Does not send and does not write sent-registry.json.
 *
 * Cold outreach must NOT go through Resend (owner 2026-10-17). `--prepare` and
 * `--finalize` exit immediately. `--dry-run` still previews copy.
 * Manual cold test: Gmail gui.quickprolist@gmail.com. See docs/campaigns/board.md.
 *
 *   --dry-run  → preview text only
 *   --prepare / --finalize → refused (retired Resend cold-outreach path)
 *
 * This file does not send and does not print a Resend payload. Send-ready
 * checks (postal address, one enroll link, MX, suppression, bounce-rate pause)
 * stay in lib/campaign-prepare.ts and the Gmail batch tooling.
 */
import { loadCampaignEnv } from './load-campaign-env'
import { formatMarketingFromAddress } from '../lib/email'
import { isSuppressed, normalizeEmail, SuppressedError } from '../lib/suppressions'
import { isDatabaseConfigured } from '../lib/db'
import { applyCampaignDefaults, getCampaignFromEmail, getCampaignSiteUrl } from '../lib/campaign-defaults'
import { getCampaignOwnerBccEmail } from '../lib/campaign-owner-bcc'
import { findSentByEmail } from '../lib/campaign-sent-registry'
import { renderCampaignManagerEmail } from '../lib/campaign-prepare'

loadCampaignEnv()
applyCampaignDefaults()

if (!process.env.UNSUBSCRIBE_SECRET && !process.env.CRON_SECRET && process.env.QA_ADMIN_SECRET) {
  process.env.UNSUBSCRIBE_SECRET = process.env.QA_ADMIN_SECRET
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  if (i === -1 || i + 1 >= process.argv.length) return undefined
  return process.argv[i + 1]
}

const to = arg('--to')
const businessName = arg('--business')
const city = arg('--city')
const category = arg('--category')
const enrollUrl = arg('--enroll-url')
const batch = arg('--batch') ?? new Date().toISOString().slice(0, 10)
const dryRun = process.argv.includes('--dry-run')
const prepare = process.argv.includes('--prepare')
const finalize = process.argv.includes('--finalize')
const forceResend = process.argv.includes('--force')
const waveArg = arg('--wave') as 'listed' | 'outreach' | 'test' | 'follow-up' | undefined

const usage =
  'Usage: npx tsx scripts/campaign-manager-send.ts --to <email> --business "<name>" --city <slug> --category <slug> ' +
  '[--enroll-url <url>] [--batch <id>] [--wave listed|outreach|test|follow-up] [--dry-run | --prepare | --finalize --resend-id <id>] [--force]'

if (!to || !businessName || !city || !category) {
  console.error(usage)
  process.exit(1)
}

if (prepare || finalize) {
  console.error(
    'Cold outreach must not go through Resend (owner 2026-10-17). Board status is PAUSED. ' +
      'Planned test is manual Gmail from gui.quickprolist@gmail.com (~20 emails over a few days, cap 5/day). ' +
      'Resend stays for transactional/opted-in mail only. See docs/campaigns/board.md. ' +
      '--dry-run is still allowed for copy preview.',
  )
  process.exit(1)
}

if (!dryRun) {
  console.error(
    'Cold outreach is manual Gmail (gui.quickprolist@gmail.com), not this script. Use --dry-run to preview copy only.',
  )
  console.error('See docs/campaigns/board.md')
  process.exit(1)
}

function requireUnsubSecret(): void {
  if (!process.env.UNSUBSCRIBE_SECRET && !process.env.CRON_SECRET) {
    console.error('UNSUBSCRIBE_SECRET (or CRON_SECRET) not set')
    process.exit(1)
  }
}

type BuiltEmail = {
  subject: string
  text: string
  html: string
  headers: Record<string, string>
  bcc: string
  from: string
  idempotencyKey: string
  wave: 'listed' | 'outreach' | 'test' | 'follow-up'
}

async function buildCampaignEmail(skipRealCompliance: boolean, resolvedEnrollUrl?: string): Promise<BuiltEmail> {
  if (!skipRealCompliance) requireUnsubSecret()
  const siteUrl = getCampaignSiteUrl()
  const wave = waveArg ?? 'outreach'
  const rendered = renderCampaignManagerEmail({
    to: to!,
    businessName: businessName!,
    city: city!,
    category: category!,
    wave,
    enrollUrl: resolvedEnrollUrl ?? enrollUrl,
    siteUrl,
    skipCompliance: skipRealCompliance,
  })
  const bcc = getCampaignOwnerBccEmail()
  const from = formatMarketingFromAddress(getCampaignFromEmail())
  const idempotencyKey = `campaign/${batch}/${normalizeEmail(to!)}`
  return { ...rendered, bcc, from, idempotencyKey, wave }
}

async function assertCanSend(): Promise<void> {
  const normalized = normalizeEmail(to!)
  const prior = findSentByEmail(to!)
  const skipDedupe = dryRun && !prepare && !finalize
  if (prior && !forceResend && !skipDedupe) {
    console.error(
      JSON.stringify({
        error: 'already_sent',
        email: prior.email,
        sentAt: prior.sentAt,
        batch: prior.batch,
        resendId: prior.resendId,
      })
    )
    process.exit(1)
  }
  if (prior && dryRun) {
    console.log('--- would skip (already in sent-registry); use --force to resend ---')
    console.log(JSON.stringify(prior, null, 2))
  }

  if (!dryRun && isDatabaseConfigured()) {
    if (await isSuppressed('email', normalized)) {
      throw new SuppressedError('email', normalized)
    }
  }
}

async function main() {
  await assertCanSend()

  const built = await buildCampaignEmail(Boolean(dryRun))
  console.log('--- dry-run ---')
  console.log('To:', to)
  console.log('Bcc:', built.bcc)
  console.log('Subject:', built.subject)
  console.log(built.text)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
