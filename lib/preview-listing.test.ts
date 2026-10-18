import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Business } from './business'

const { queryMock, getCuratedByIdMock, getCampaignProspectMock, getInvitationByTokenMock } = vi.hoisted(() => ({
  queryMock: vi.fn<(...args: unknown[]) => Promise<{ id: string; name: string }[]>>(async () => []),
  getCuratedByIdMock: vi.fn(),
  getCampaignProspectMock: vi.fn(),
  getInvitationByTokenMock: vi.fn(),
}))

vi.mock('./db', () => ({
  isDatabaseConfigured: () => true,
  query: (...args: unknown[]) => queryMock(...args),
}))
vi.mock('./kv', () => ({ getCuratedById: getCuratedByIdMock }))
vi.mock('./campaign-prospects', () => ({ getCampaignProspect: getCampaignProspectMock }))
vi.mock('./invitations', () => ({ getInvitationByToken: getInvitationByTokenMock }))

import { fillGmailRowLinks } from './gmail-preview-links'
import { businessFromProspect, findExistingListingMatches, loadPreviewListing } from './preview-listing'
import type { PreviewTokenRecord } from './preview-tokens'

function record(overrides: Partial<PreviewTokenRecord> = {}): PreviewTokenRecord {
  return {
    token: 'AbCdEfGhIjKlMnOpQrStUv',
    prospectId: 'prospect-1',
    curatedBusinessId: null,
    invitationToken: null,
    recipientEmail: 'geek@example.com',
    campaignId: null,
    createdAt: '2026-10-01T00:00:00Z',
    expiresAt: null,
    firstViewedAt: null,
    lastViewedAt: null,
    viewCount: 0,
    lastRef: null,
    lastUserAgent: null,
    optedOutAt: null,
    ...overrides,
  }
}

describe('preview listing lookup', () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue([])
    getCuratedByIdMock.mockReset()
    getCampaignProspectMock.mockReset()
    getInvitationByTokenMock.mockReset()
  })

  it('reads an existing listing and never writes one', async () => {
    await findExistingListingMatches({
      name: 'Geek Company',
      email: 'Geek@Example.com',
      phone: '(770) 555-0101',
      city: 'Acworth, GA',
    })
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]]
    expect(sql.trim().toLowerCase().startsWith('select')).toBe(true)
    expect(sql).not.toMatch(/\b(insert|update|delete)\b/i)
    expect(params).toEqual(['geek@example.com', '7705550101', 'geek company', 'acworth'])
  })

  it('builds a prospect listing without placeholder copy and hides a missing phone', () => {
    const business = businessFromProspect({
      id: 'prospect-1',
      businessName: 'Geek Company',
      phone: null,
      website: 'https://geek.example',
      logoUrl: null,
      category: 'Computer repair',
      city: 'acworth',
    })
    expect(business.name).toBe('Geek Company')
    expect(business.phone).toBe('')
    expect(business.categories).toEqual(['Computer repair'])
    expect(business.cities).toEqual(['Acworth'])
    expect(business.websiteUrl).toBe('https://geek.example')
    expect(JSON.stringify(business).toLowerCase()).not.toContain('lorem')
  })

  it('flags a second listing match and does not publish', async () => {
    getCampaignProspectMock.mockResolvedValue({
      id: 'prospect-1',
      businessName: 'Geek Company',
      email: 'geek@example.com',
      phone: '7705550101',
      website: null,
      logoUrl: null,
      category: 'Computer repair',
      city: 'acworth',
    })
    queryMock.mockResolvedValue([{ id: 'curated-existing', name: 'Geek Company' }])

    const listing = await loadPreviewListing(record())
    expect(listing?.business.name).toBe('Geek Company')
    expect(listing?.existingListingNote).toBe(true)
    expect(listing?.matchedListingIds).toEqual(['curated-existing'])
    const sql = (queryMock.mock.calls[0] as unknown as [string])[0]
    expect(sql).not.toMatch(/\b(insert|update|delete)\b/i)
    expect(getCuratedByIdMock).not.toHaveBeenCalled()
  })

  it('does not warn when the preview is already that curated listing', async () => {
    const curated: Business = {
      id: 'curated-existing',
      source: 'manual',
      name: 'Geek Company',
      rating: null,
      reviewCount: null,
      phone: '7705550101',
      address: 'Acworth, GA',
      imageUrl: '',
      url: '',
      categories: ['Computer repair'],
      cities: ['acworth'],
    }
    getCuratedByIdMock.mockResolvedValue(curated)
    queryMock.mockResolvedValue([{ id: 'curated-existing', name: 'Geek Company' }])

    const listing = await loadPreviewListing(record({
      prospectId: null,
      curatedBusinessId: 'curated-existing',
    }))
    expect(listing?.existingListingNote).toBe(false)
    expect(listing?.business.name).toBe('Geek Company')
    expect(listing?.business.contactEmail).toBeUndefined()
  })

  it('resolves a campaign preview minted with only an invitation', async () => {
    const invitationToken = '11111111-1111-4111-8111-111111111111'
    getInvitationByTokenMock.mockResolvedValue({
      id: 'inv-1',
      token: invitationToken,
      business_name: 'Ready Plumbing',
      yelp_id: null,
      yelp_data: { phone: '404-555-0100', websiteUrl: 'https://ready.example' },
      category: 'plumbing',
      cities: ['atlanta'],
      monthly_price: 29.99,
      status: 'pending',
      stripe_session_id: null,
      stripe_subscription_id: null,
      curated_business_id: null,
      created_at: '2026-10-01T00:00:00Z',
      expires_at: '2099-01-01T00:00:00Z',
      canceled_at: null,
      trial_ends_at: null,
      contact_email: 'owner@ready.example',
    })

    const minted = {
      recipientEmail: '',
      invitationToken: '',
      campaignId: '',
      prospectId: null as string | null,
      curatedBusinessId: null as string | null,
    }
    const filled = await fillGmailRowLinks(
      {
        business: 'Ready Plumbing',
        trade: 'Plumbers',
        city: 'Atlanta',
        email: 'owner@ready.example',
        sourceUrl: null,
        enrollUrl: 'https://www.quickprolist.com/enroll/PENDING_INVITATION?ref=gmail-ready-plumbing',
        enrollUrlStatus: 'placeholder',
        previewUrl: '{previewUrl}',
        previewUrlStatus: 'placeholder',
        roleAddress: false,
        catchAll: 'not_probed',
        mx: true,
        resendStatus: null,
        text: 'Preview: {previewUrl}',
      },
      {
        siteUrl: 'https://www.quickprolist.com',
        previewBaseUrl: 'https://dev.example.com',
        databaseUrl: 'postgres://dev.example/neondb',
        invitationToken,
        minter: {
          createPreviewToken: async (input) => {
            minted.recipientEmail = input.recipientEmail
            minted.invitationToken = input.invitationToken
            minted.campaignId = input.campaignId
            minted.prospectId = input.prospectId ?? null
            minted.curatedBusinessId = input.curatedBusinessId ?? null
            return 'AbCdEfGhIjKlMnOpQrStUv'
          },
        },
      }
    )

    expect(minted).toMatchObject({
      recipientEmail: 'owner@ready.example',
      invitationToken,
      campaignId: 'gmail-test',
      prospectId: null,
      curatedBusinessId: null,
    })
    expect(filled.previewUrl).toBe('https://dev.example.com/preview/AbCdEfGhIjKlMnOpQrStUv')

    const listing = await loadPreviewListing(
      record({
        prospectId: minted.prospectId,
        curatedBusinessId: minted.curatedBusinessId,
        invitationToken: minted.invitationToken,
        recipientEmail: minted.recipientEmail,
        campaignId: 'gmail-test',
      })
    )
    expect(listing?.business.name).toBe('Ready Plumbing')
    expect(listing?.business.phone).toBe('404-555-0100')
    expect(listing?.business.cities).toEqual(['Atlanta'])
    expect(listing?.business.categories).toEqual(['Plumbers'])
    expect(getCampaignProspectMock).not.toHaveBeenCalled()
    expect(getCuratedByIdMock).not.toHaveBeenCalled()
    const sql = String((queryMock.mock.calls[0] as unknown as [string] | undefined)?.[0] ?? '')
    expect(sql).not.toMatch(/\b(insert|update|delete)\b/i)
  })
})
