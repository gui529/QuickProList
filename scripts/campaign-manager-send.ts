/**
 * Campaign email builder + sent-registry (delivery via Resend MCP only).
 * See docs/campaigns/skills/resend-api.md
 *
 *   --prepare  → JSON for Resend MCP
 *   --finalize --resend-id <id>  → after MCP success
 *   --dry-run  → preview text only
 */
import { loadCampaignEnv } from './load-campaign-env'
import { formatMarketingFromAddress } from '../lib/email'
import { isSuppressed, normalizeEmail, SuppressedError } from '../lib/suppressions'
import { isDatabaseConfigured } from '../lib/db'
import { applyCampaignDefaults, getCampaignFromEmail, getCampaignSiteUrl } from '../lib/campaign-defaults'
import { getCampaignOwnerBccEmail } from '../lib/campaign-owner-bcc'
import { findSentByEmail, loadSentRegistry, recordSent, type SentRegistryEntry } from '../lib/campaign-sent-registry'
import { createInvitation } from '../lib/invitations'
import { normalizeCategory } from '../lib/categories'
import {
  assertCampaignPostalAddress,
  assertCampaignPreviewLinks,
  assertRecentBounceRate,
  assertRecipientDomainHasMx,
  bounceRateMeasurementWarning,
  CampaignPrepareError,
  isEnrollPreviewUrl,
  recentDeliveryStatuses,
  renderCampaignManagerEmail,
} from '../lib/campaign-prepare'

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

async function resolvePrepareEnrollUrl(siteUrl: string): Promise<string> {
  if (enrollUrl) {
    if (!isEnrollPreviewUrl(enrollUrl)) {
      throw new CampaignPrepareError(
        'Refusing to prepare: --enroll-url must be one /enroll/<token> preview link.'
      )
    }
    return enrollUrl
  }
  if (!isDatabaseConfigured()) {
    throw new CampaignPrepareError(
      'Refusing to prepare: DATABASE_URL is not set, so this script cannot create an /enroll/<token> invitation. Not sending a "link below" email without a link.'
    )
  }
  const token = await createInvitation({
    businessName: businessName!,
    category: normalizeCategory(category!),
    cities: [city!],
    monthlyPrice: 29.99,
    contactEmail: to,
  })
  return `${siteUrl}/enroll/${token}`
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

  if (prepare) {
    assertCampaignPostalAddress()
    const statuses = recentDeliveryStatuses(loadSentRegistry().sent)
    const unmeasured = bounceRateMeasurementWarning(statuses)
    if (unmeasured) console.error(unmeasured)
    assertRecentBounceRate(statuses)
    await assertRecipientDomainHasMx(to!)
    if (!isDatabaseConfigured()) {
      throw new CampaignPrepareError(
        'Refusing to prepare: DATABASE_URL is not set, so the do-not-contact list cannot be checked.'
      )
    }
    if (await isSuppressed('email', normalizeEmail(to!))) {
      throw new CampaignPrepareError(
        `Refusing to prepare: ${normalizeEmail(to!)} is already on the do-not-contact list. Do not send.`
      )
    }
    const siteUrl = getCampaignSiteUrl()
    const resolvedEnrollUrl = await resolvePrepareEnrollUrl(siteUrl)
    const prepared = await buildCampaignEmail(false, resolvedEnrollUrl)
    assertCampaignPreviewLinks(prepared.text, prepared.html)
    console.error(
      'Cold outreach must not be sent through Resend (AUP). The board stays PAUSED. Use docs/campaigns/gmail-test-batch.json and record with scripts/campaign-check-sent.ts --record.'
    )
    console.log(
      JSON.stringify({
        doNotSendViaResend: true,
        enrollUrl: resolvedEnrollUrl,
        resend: {
          from: prepared.from,
          to: [to!],
          bcc: [prepared.bcc],
          subject: prepared.subject,
          text: prepared.text,
          html: prepared.html,
          headers: prepared.headers,
        },
        idempotencyKey: prepared.idempotencyKey,
        registry: registryEntry(prepared.subject, ''),
      })
    )
    return
  }

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
