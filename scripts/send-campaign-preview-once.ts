/**
 * Owner / campaign-manager test send via Resend API (see resend skill).
 * Usage: npx tsx scripts/send-campaign-preview-once.ts <toEmail> [businessName]
 *
 * Loads `.env.local`, then `.env.campaign-send.local` if present (e.g. vercel env pull).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { Resend } from 'resend'
import { loadEnvLocal } from './load-env-local'
import { DEFAULT_MESSAGE } from '../lib/campaigns'
import { expandCampaignMessage } from '../lib/campaign-message'
import {
  buildMarketingEmailSubject,
  buildPersonalMarketingEmail,
  formatMarketingFromAddress,
} from '../lib/email'
import { buildUnsubscribeUrl } from '../lib/unsubscribe'

function loadEnvFile(relativePath: string, override = false): void {
  const path = resolve(import.meta.dirname, '..', relativePath)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (override || !process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()
loadEnvFile('.env.campaign-send.local', true)

const to = process.argv[2]
const businessName = process.argv[3] ?? "Gui's Quality Plumbing"

if (!to) {
  console.error('Usage: npx tsx scripts/send-campaign-preview-once.ts <toEmail> [businessName]')
  process.exit(1)
}

const apiKey = process.env.RESEND_API_KEY
const fromRaw = process.env.RESEND_FROM_EMAIL
if (!apiKey) {
  console.error('RESEND_API_KEY not set (use .env.local or vercel env pull)')
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

const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')
const body = expandCampaignMessage(DEFAULT_MESSAGE, {
  businessName,
  city: 'marietta',
  category: 'plumbers',
})

const reason =
  'You received this one-time note because your business offers home services in an area we cover on QuickProList.'
const unsubUrl = buildUnsubscribeUrl(to)
const compliance = {
  text: `\n\n${reason}\nUnsubscribe: ${unsubUrl}`,
  html: `${reason}<br/><a href="${unsubUrl}">Unsubscribe</a>`,
  headers: {
    'List-Unsubscribe': `<${unsubUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  },
}

const { text, html } = buildPersonalMarketingEmail(businessName, body, {
  city: 'marietta',
  category: 'plumbers',
}, compliance, siteUrl)

const subject = buildMarketingEmailSubject(businessName, {
  city: 'marietta',
  category: 'plumbers',
})

const resend = new Resend(apiKey)
const from = formatMarketingFromAddress(fromRaw)
const idempotencyKey = `campaign-preview/${to.toLowerCase()}/2026-10-15`

async function main() {
  const { data, error } = await resend.emails.send(
    {
      from,
      to: [to],
      subject,
      text,
      html,
      headers: compliance.headers,
    },
    { idempotencyKey }
  )

  if (error) {
    console.error('Resend error:', error.message)
    process.exit(1)
  }
  console.log('Sent:', data?.id)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
