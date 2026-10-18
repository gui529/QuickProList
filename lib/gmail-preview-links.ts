import type { GmailBatchRow } from './gmail-test-batch'
import { enrollUrlWithToken } from './gmail-campaign'
import { assertDevPreviewBaseUrl, fillPreviewUrlPlaceholder, previewUrlForToken } from './preview-tokens'

/**
 * Production Neon branch from docs/dev-database-plan.md.
 * A connection string for that branch contains this id or the matching endpoint name.
 */
export const PRODUCTION_DATABASE_BRANCH = 'br-restless-waterfall-b49bwrif'
const PRODUCTION_DATABASE_ENDPOINT = 'ep-restless-waterfall'

export const PREVIEW_URL_PLACEHOLDER = '{previewUrl}'

export function isProductionDatabaseUrl(databaseUrl: string | null | undefined): boolean {
  const value = databaseUrl?.toLowerCase() ?? ''
  if (!value) return false
  return value.includes(PRODUCTION_DATABASE_BRANCH) || value.includes(PRODUCTION_DATABASE_ENDPOINT)
}

/**
 * Preview links are minted only for a non-production PREVIEW_BASE_URL and a
 * database that is not the production branch. This throws before any insert.
 */
export function assertGmailPreviewMintAllowed(
  previewBaseUrl: string | null | undefined,
  databaseUrl: string | null | undefined
): string {
  const trimmed = previewBaseUrl?.trim() ?? ''
  if (!trimmed) throw new Error('PREVIEW_BASE_URL is required and must be a non-production host')
  if (isProductionDatabaseUrl(databaseUrl)) {
    throw new Error('Refusing to mint preview tokens against the production database')
  }
  return assertDevPreviewBaseUrl(trimmed)
}

export interface GmailPreviewMinter {
  createPreviewToken(input: {
    recipientEmail: string
    invitationToken: string
    campaignId: string
  }): Promise<string>
}

/**
 * Replace a placeholder enroll URL and {previewUrl}.
 * Calls the minter only after the non-production checks pass.
 */
export async function fillGmailRowLinks(
  row: GmailBatchRow,
  input: {
    siteUrl: string
    previewBaseUrl: string | null | undefined
    databaseUrl: string | null | undefined
    invitationToken: string
    minter: GmailPreviewMinter
  }
): Promise<GmailBatchRow> {
  const previewBase = assertGmailPreviewMintAllowed(input.previewBaseUrl, input.databaseUrl)
  if (!row.email || !row.enrollUrl) return row
  const previewToken = await input.minter.createPreviewToken({
    recipientEmail: row.email,
    invitationToken: input.invitationToken,
    campaignId: 'gmail-test',
  })
  const previewUrl = previewUrlForToken(previewBase, previewToken)
  const enrollUrl = enrollUrlWithToken(input.siteUrl, input.invitationToken, row.enrollUrl)
  const withEnroll = row.text?.split(row.enrollUrl).join(enrollUrl)
  return {
    ...row,
    enrollUrl,
    enrollUrlStatus: 'live',
    previewUrl,
    previewUrlStatus: 'live',
    text: withEnroll == null ? row.text : fillPreviewUrlPlaceholder(withEnroll, previewUrl),
  }
}
