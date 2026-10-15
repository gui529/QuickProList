/**
 * Standalone campaign email — Resend API only (no app server, no Admin, no Neon).
 * Campaign-manager's primary send path. See docs/campaigns/skills/resend-api.md
 *
 * Usage:
 *   npx tsx scripts/campaign-manager-send.ts --to pro@example.com --business "Acme Plumbing" \
 *     --city marietta --category plumbers [--enroll-url https://...] [--batch 2026-10-15-atl] [--dry-run]
 */
import { Resend } from 'resend'
import { loadCampaignEnv } from './load-campaign-env'
import { DEFAULT_MESSAGE } from '../lib/campaigns'
import { expandCampaignMessage } from '../lib/campaign-message'
import {
  buildMarketingEmailSubject,
  buildPersonalMarketingEmail,
  formatMarketingFromAddress,
} from '../lib/email'
import { buildUnsubscribeUrl } from '../lib/unsubscribe'
import { isSuppressed, normalizeEmail, SuppressedError } from '../lib/suppressions'
import { isDatabaseConfigured } from '../lib/db'
import { getCampaignOwnerBccEmail } from '../lib/campaign-owner-bcc'

loadCampaignEnv()

// Local dev: `vercel env pull` often leaves secrets empty; QA_ADMIN_SECRET matches prod unsub in some envs.
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

if (!to || !businessName || !city || !category) {
  console.error(
    'Usage: npx tsx scripts/campaign-manager-send.ts --to <email> --business "<name>" --city <slug> --category <slug> [--enroll-url <url>] [--batch <id>] [--dry-run]'
  )
  process.exit(1)
}

function requireSendEnv(): { apiKey: string; fromRaw: string } {
  const apiKey = process.env.RESEND_API_KEY
  const fromRaw = process.env.RESEND_FROM_EMAIL
  if (!apiKey) {
    console.error('RESEND_API_KEY not set (vercel env pull .env.campaign-send.local)')
    process.exit(1)
  }
  if (!fromRaw) {
    console.error('RESEND_FROM_EMAIL not set')
    process.exit(1)
  }
  if (!process.env.UNSUBSCRIBE_SECRET && !process.env.CRON_SECRET) {
    console.error('UNSUBSCRIBE_SECRET (or CRON_SECRET) not set')
    process.exit(1)
  }
  return { apiKey, fromRaw }
}

async function main() {
  const normalized = normalizeEmail(to!)
  if (!dryRun && isDatabaseConfigured()) {
    if (await isSuppressed('email', normalized)) {
      throw new SuppressedError('email', normalized)
    }
  }

  const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')
  const body = expandCampaignMessage(DEFAULT_MESSAGE, { businessName: businessName!, city: city!, category: category! })

  const reason =
    'You received this one-time note because your business offers home services in an area we cover on QuickProList.'
  const compliance = dryRun
    ? {
        text: `\n\n${reason}\nUnsubscribe: (set at send time)`,
        html: `${reason}`,
        headers: {} as Record<string, string>,
      }
    : (() => {
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

  const emailOpts = { city: city!, category: category!, enrollUrl }
  const { text, html } = buildPersonalMarketingEmail(businessName!, body, emailOpts, compliance, siteUrl)
  const subject = buildMarketingEmailSubject(businessName!, emailOpts)

  const bcc = getCampaignOwnerBccEmail()

  if (dryRun) {
    console.log('--- dry-run ---')
    console.log('To:', to)
    console.log('Bcc:', bcc)
    console.log('Subject:', subject)
    console.log(text)
    return
  }

  const { apiKey, fromRaw } = requireSendEnv()

  const resend = new Resend(apiKey)
  const from = formatMarketingFromAddress(fromRaw)
  const idempotencyKey = `campaign/${batch}/${normalized}`

  const { data, error } = await resend.emails.send(
    { from, to: [to!], bcc: [bcc], subject, text, html, headers: compliance.headers },
    { idempotencyKey }
  )

  if (error) {
    console.error('Resend error:', error.message)
    process.exit(1)
  }
  console.log(JSON.stringify({ id: data?.id, to, bcc, subject, batch, idempotencyKey }))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
