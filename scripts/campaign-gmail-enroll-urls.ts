/**
 * Replace PENDING_INVITATION enroll URLs in docs/campaigns/gmail-test-batch.json
 * with real /enroll/<token> links, and fill {previewUrl} from preview_tokens.
 * Requires DATABASE_URL. Does not send email.
 *
 * PREVIEW_BASE_URL must be a non-production host (not quickprolist.com).
 * Preview tokens are not minted when DATABASE_URL is the production Neon branch.
 *
 *   PREVIEW_BASE_URL=https://dev.example.com npx tsx scripts/campaign-gmail-enroll-urls.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadCampaignEnv } from './load-campaign-env'
import { isDatabaseConfigured } from '../lib/db'
import { createInvitation } from '../lib/invitations'
import { SUBSCRIPTION_MONTHLY_PRICE_USD } from '../lib/subscription-terms'
import { normalizeCategory } from '../lib/categories'
import { getCampaignSiteUrl } from '../lib/campaign-defaults'
import type { GmailBatchRow, GmailTestBatch } from '../lib/gmail-test-batch'
import { ENROLL_URL_PLACEHOLDER, isEnrollPlaceholder } from '../lib/gmail-campaign'
import { assertGmailPreviewMintAllowed, fillGmailRowLinks } from '../lib/gmail-preview-links'
import { createPreviewToken } from '../lib/preview-tokens'

loadCampaignEnv()

const path = resolve(process.cwd(), 'docs/campaigns/gmail-test-batch.json')

function needsLink(row: GmailBatchRow): boolean {
  return Boolean(row.email && isEnrollPlaceholder(row.enrollUrl))
}

async function fill(row: GmailBatchRow, siteUrl: string, previewBase: string): Promise<GmailBatchRow> {
  if (!needsLink(row) || !row.email || !row.enrollUrl) return row
  const invitationToken = await createInvitation({
    businessName: row.business,
    category: normalizeCategory(row.trade),
    cities: [row.city.trim().toLowerCase()],
    monthlyPrice: SUBSCRIPTION_MONTHLY_PRICE_USD,
    contactEmail: row.email,
  })
  return fillGmailRowLinks(row, {
    siteUrl,
    previewBaseUrl: previewBase,
    databaseUrl: process.env.DATABASE_URL,
    invitationToken,
    minter: { createPreviewToken },
  })
}

async function main() {
  if (!isDatabaseConfigured()) {
    console.error(
      'DATABASE_URL is not set. Invitations and preview tokens were not created. Each send-ready row keeps enrollUrl ' +
        `${ENROLL_URL_PLACEHOLDER} and previewUrl {previewUrl}.`
    )
    process.exit(1)
  }
  let previewBase: string
  try {
    previewBase = assertGmailPreviewMintAllowed(process.env.PREVIEW_BASE_URL, process.env.DATABASE_URL)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
  const batch = JSON.parse(readFileSync(path, 'utf8')) as GmailTestBatch
  const siteUrl = getCampaignSiteUrl()
  batch.sendReady = await Promise.all(batch.sendReady.map((row) => fill(row, siteUrl, previewBase)))
  batch.flagged = await Promise.all(batch.flagged.map((row) => fill(row, siteUrl, previewBase)))
  const stillPlaceholder = [...batch.sendReady, ...batch.flagged].some((row) => isEnrollPlaceholder(row.enrollUrl))
  batch.ownerBlockers = batch.ownerBlockers.filter((line) => !line.startsWith('Enroll URLs are placeholders.'))
  if (stillPlaceholder) {
    batch.ownerBlockers.unshift('Some enroll URLs are still placeholders.')
  }
  batch.readyToSend = false
  writeFileSync(path, `${JSON.stringify(batch, null, 2)}\n`, 'utf8')
  console.log(`Updated enroll and preview URLs in ${path}. readyToSend stays false. Nothing was sent.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
