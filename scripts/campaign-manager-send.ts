/**
 * Campaign email builder + sent-registry (delivery via Resend MCP only).
 * See docs/campaigns/skills/resend-api.md
 *
 *   --prepare  → JSON for Resend MCP
 *   --finalize --resend-id <id>  → after MCP success
 *   --dry-run  → preview text only
 */
import { loadCampaignEnv } from './load-campaign-env'
import { DEFAULT_MESSAGE, LISTED_MESSAGE } from '../lib/campaigns'
import { expandCampaignMessage } from '../lib/campaign-message'
import {
  buildMarketingEmailSubject,
  buildPersonalMarketingEmail,
  formatMarketingFromAddress,
} from '../lib/email'
import { buildUnsubscribeUrl } from '../lib/unsubscribe'
import { isSuppressed, normalizeEmail, SuppressedError } from '../lib/suppressions'
import { isDatabaseConfigured } from '../lib/db'
import { applyCampaignDefaults, getCampaignFromEmail, getCampaignSiteUrl } from '../lib/campaign-defaults'
import { getCampaignOwnerBccEmail } from '../lib/campaign-owner-bcc'
import { findSentByEmail, recordSent, type SentRegistryEntry } from '../lib/campaign-sent-registry'

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
const resendIdArg = arg('--resend-id')
const forceResend = process.argv.includes('--force')
const waveArg = arg('--wave') as 'listed' | 'outreach' | 'test' | 'follow-up' | undefined

const usage =
  'Usage: npx tsx scripts/campaign-manager-send.ts --to <email> --business "<name>" --city <slug> --category <slug> ' +
  '[--enroll-url <url>] [--batch <id>] [--wave listed|outreach|test|follow-up] [--dry-run | --prepare | --finalize --resend-id <id>] [--force]'

if (!to || !businessName || !city || !category) {
  console.error(usage)
  process.exit(1)
}

if (!dryRun && !prepare && !finalize) {
  console.error('Campaign delivery is Resend MCP only: use --prepare, then MCP send, then --finalize --resend-id <id>.')
  console.error('See docs/campaigns/skills/resend-api.md')
  process.exit(1)
}

if (finalize && !resendIdArg) {
  console.error('--finalize requires --resend-id <id> from Resend MCP after send')
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

async function buildCampaignEmail(skipRealCompliance: boolean): Promise<BuiltEmail> {
  const siteUrl = getCampaignSiteUrl()
  const wave = waveArg ?? 'outreach'
  const template = wave === 'listed' ? LISTED_MESSAGE : DEFAULT_MESSAGE
  const body = expandCampaignMessage(template, { businessName: businessName!, city: city!, category: category! })

  const reason =
    'You received this one-time note because your business offers home services in an area we cover on QuickProList.'
  const compliance = skipRealCompliance
    ? {
        text: `\n\n${reason}\nUnsubscribe: (set at send time)`,
        html: `${reason}`,
        headers: {} as Record<string, string>,
      }
    : (() => {
        requireUnsubSecret()
        const unsubUrl = buildUnsubscribeUrl(to!)
        return {
          text: `\n\n${reason}\nUnsubscribe: ${unsubUrl}`,
          html: `${reason}<br/><a href="${unsubUrl}">Unsubscribe</a>`,
          headers: {
            'List-Unsubscribe': `<${unsubUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }
      })()

  const emailOpts = { city: city!, category: category!, enrollUrl, campaignWave: wave }
  const { text, html } = buildPersonalMarketingEmail(businessName!, body, emailOpts, compliance, siteUrl)
  const subject = buildMarketingEmailSubject(businessName!, emailOpts)
  const bcc = getCampaignOwnerBccEmail()
  const fromRaw = getCampaignFromEmail()
  const from = formatMarketingFromAddress(fromRaw)
  const normalized = normalizeEmail(to!)
  const idempotencyKey = `campaign/${batch}/${normalized}`

  return { subject, text, html, headers: compliance.headers, bcc, from, idempotencyKey, wave }
}

function registryEntry(subject: string, resendId: string): SentRegistryEntry {
  return {
    email: to!,
    businessName: businessName!,
    city: city!,
    category: category!,
    batch,
    resendId,
    subject,
    sentAt: new Date().toISOString(),
    wave: waveArg,
  }
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

  if (finalize) {
    const built = await buildCampaignEmail(false)
    recordSent(registryEntry(built.subject, resendIdArg!), { force: forceResend })
    console.log(
      JSON.stringify({
        id: resendIdArg,
        to,
        bcc: built.bcc,
        subject: built.subject,
        batch,
        idempotencyKey: built.idempotencyKey,
        registered: true,
      })
    )
    return
  }

  const skipRealCompliance = dryRun && !prepare
  const built = await buildCampaignEmail(skipRealCompliance)

  if (dryRun && !prepare) {
    console.log('--- dry-run ---')
    console.log('To:', to)
    console.log('Bcc:', built.bcc)
    console.log('Subject:', built.subject)
    console.log(built.text)
    return
  }

  if (prepare) {
    console.log(
      JSON.stringify({
        resend: {
          from: built.from,
          to: [to!],
          bcc: [built.bcc],
          subject: built.subject,
          text: built.text,
          html: built.html,
          headers: built.headers,
        },
        idempotencyKey: built.idempotencyKey,
        registry: registryEntry(built.subject, ''),
      })
    )
    return
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
