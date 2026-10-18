import { describe, expect, it, vi } from 'vitest'
import type { GmailBatchRow } from './gmail-test-batch'
import { ENROLL_URL_PLACEHOLDER, withGmailAttributionRef } from './gmail-campaign'
import {
  PRODUCTION_DATABASE_BRANCH,
  assertGmailPreviewMintAllowed,
  fillGmailRowLinks,
  isProductionDatabaseUrl,
} from './gmail-preview-links'

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv'
const INVITATION = '11111111-1111-4111-8111-111111111111'

function row(textExtra = ''): GmailBatchRow {
  const enrollUrl = withGmailAttributionRef(ENROLL_URL_PLACEHOLDER, 'Ready Plumbing')
  return {
    business: 'Ready Plumbing',
    trade: 'Plumbers',
    city: 'Atlanta',
    email: 'owner@ready.example',
    sourceUrl: null,
    enrollUrl,
    enrollUrlStatus: 'placeholder',
    previewUrl: '{previewUrl}',
    previewUrlStatus: 'placeholder',
    roleAddress: false,
    catchAll: 'not_probed',
    mx: true,
    resendStatus: null,
    text: `Worth two minutes to look?\n${enrollUrl}\n\nPreview: {previewUrl}${textExtra}`,
  }
}

describe('Gmail preview URL fill', () => {
  it('fills {previewUrl} from a minted token on a non-production base', async () => {
    const createPreviewToken = vi.fn(async () => TOKEN)
    const filled = await fillGmailRowLinks(row(), {
      siteUrl: 'https://www.quickprolist.com',
      previewBaseUrl: 'https://dev.example.com/',
      databaseUrl: 'postgres://dev.example/neondb',
      invitationToken: INVITATION,
      minter: { createPreviewToken },
    })

    expect(createPreviewToken).toHaveBeenCalledWith({
      recipientEmail: 'owner@ready.example',
      invitationToken: INVITATION,
      campaignId: 'gmail-test',
    })
    expect(filled.previewUrl).toBe(`https://dev.example.com/preview/${TOKEN}`)
    expect(filled.previewUrlStatus).toBe('live')
    expect(filled.text).toContain(`https://dev.example.com/preview/${TOKEN}`)
    expect(filled.text).not.toContain('{previewUrl}')
    expect(filled.enrollUrl).toBe(`https://www.quickprolist.com/enroll/${INVITATION}?ref=gmail-ready-plumbing`)
    expect(filled.text).toContain(filled.enrollUrl)
    expect(filled.text?.match(/https?:\/\/\S+/g)).toHaveLength(2)
  })

  it('gives each recipient its own token', async () => {
    const tokens = ['AbCdEfGhIjKlMnOpQrStUv', 'ZyXwVuTsRqPoNmLkJiHgFe']
    const createPreviewToken = vi.fn(async () => tokens.shift() ?? TOKEN)
    const first = await fillGmailRowLinks(row(), {
      siteUrl: 'https://dev.example.com',
      previewBaseUrl: 'https://dev.example.com',
      databaseUrl: 'postgres://dev',
      invitationToken: INVITATION,
      minter: { createPreviewToken },
    })
    const secondRow = row()
    secondRow.email = 'other@ready.example'
    const second = await fillGmailRowLinks(secondRow, {
      siteUrl: 'https://dev.example.com',
      previewBaseUrl: 'https://dev.example.com',
      databaseUrl: 'postgres://dev',
      invitationToken: '22222222-2222-4222-8222-222222222222',
      minter: { createPreviewToken },
    })
    expect(first.previewUrl).not.toBe(second.previewUrl)
  })

  it('refuses a production preview host and does not mint', async () => {
    const createPreviewToken = vi.fn(async () => TOKEN)
    await expect(
      fillGmailRowLinks(row(), {
        siteUrl: 'https://www.quickprolist.com',
        previewBaseUrl: 'https://www.quickprolist.com',
        databaseUrl: 'postgres://dev',
        invitationToken: INVITATION,
        minter: { createPreviewToken },
      })
    ).rejects.toThrow(/production/)
    expect(createPreviewToken).not.toHaveBeenCalled()
    expect(() => assertGmailPreviewMintAllowed('https://quickprolist.com', 'postgres://dev')).toThrow(/production/)
    expect(() => assertGmailPreviewMintAllowed('', 'postgres://dev')).toThrow(/PREVIEW_BASE_URL/)
  })

  it('refuses the production database and does not mint', async () => {
    const createPreviewToken = vi.fn(async () => TOKEN)
    const databaseUrl = `postgres://user:pw@ep-restless-waterfall-pooler.us-east-1.aws.neon.tech/neondb?branch=${PRODUCTION_DATABASE_BRANCH}`
    expect(isProductionDatabaseUrl(databaseUrl)).toBe(true)
    expect(isProductionDatabaseUrl('postgres://dev-branch.example/neondb')).toBe(false)
    await expect(
      fillGmailRowLinks(row(), {
        siteUrl: 'https://dev.example.com',
        previewBaseUrl: 'https://dev.example.com',
        databaseUrl,
        invitationToken: INVITATION,
        minter: { createPreviewToken },
      })
    ).rejects.toThrow(/production database/)
    expect(createPreviewToken).not.toHaveBeenCalled()
  })
})
