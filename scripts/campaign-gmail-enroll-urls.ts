/**
 * Replace PENDING_INVITATION enroll URLs in docs/campaigns/gmail-test-batch.json
 * with real /enroll/<token> links. Requires DATABASE_URL. Does not send email.
 *
 *   npx tsx scripts/campaign-gmail-enroll-urls.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadCampaignEnv } from './load-campaign-env'
import { isDatabaseConfigured } from '../lib/db'
import { createInvitation } from '../lib/invitations'
import { normalizeCategory } from '../lib/categories'
import { getCampaignSiteUrl } from '../lib/campaign-defaults'
import type { GmailBatchRow, GmailTestBatch } from '../lib/gmail-test-batch'
import { ENROLL_URL_PLACEHOLDER, enrollUrlWithToken, isEnrollPlaceholder } from '../lib/gmail-campaign'

loadCampaignEnv()

const path = resolve(process.cwd(), 'docs/campaigns/gmail-test-batch.json')

function needsLink(row: GmailBatchRow): boolean {
  return Boolean(row.email && isEnrollPlaceholder(row.enrollUrl))
}

async function fill(row: GmailBatchRow, siteUrl: string): Promise<GmailBatchRow> {
  if (!needsLink(row) || !row.email || !row.enrollUrl) return row
  const token = await createInvitation({
    businessName: row.business,
    category: normalizeCategory(row.trade),
    cities: [row.city.trim().toLowerCase()],
    monthlyPrice: 29.99,
    contactEmail: row.email,
  })
  const enrollUrl = enrollUrlWithToken(siteUrl, token, row.enrollUrl)
  return {
    ...row,
    enrollUrl,
    enrollUrlStatus: 'live',
    text: row.text?.split(row.enrollUrl).join(enrollUrl),
  }
}

async function main() {
  if (!isDatabaseConfigured()) {
    console.error(
      'DATABASE_URL is not set. Invitations were not created. Each send-ready row keeps enrollUrl ' +
        `${ENROLL_URL_PLACEHOLDER} until you run this script with the production database configured.`
    )
    process.exit(1)
  }
  const batch = JSON.parse(readFileSync(path, 'utf8')) as GmailTestBatch
  const siteUrl = getCampaignSiteUrl()
  batch.sendReady = await Promise.all(batch.sendReady.map((row) => fill(row, siteUrl)))
  batch.flagged = await Promise.all(batch.flagged.map((row) => fill(row, siteUrl)))
  const stillPlaceholder = [...batch.sendReady, ...batch.flagged].some((row) => isEnrollPlaceholder(row.enrollUrl))
  batch.ownerBlockers = batch.ownerBlockers.filter((line) => !line.startsWith('Enroll URLs are placeholders.'))
  if (stillPlaceholder) {
    batch.ownerBlockers.unshift('Some enroll URLs are still placeholders.')
  }
  batch.readyToSend = false
  writeFileSync(path, `${JSON.stringify(batch, null, 2)}\n`, 'utf8')
  console.log(`Updated enroll URLs in ${path}. readyToSend stays false until the owner unpauses and supplies a postal address.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
