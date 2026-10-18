import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Business } from './business'

const { queryMock, getCuratedByIdMock, getCampaignProspectMock } = vi.hoisted(() => ({
  queryMock: vi.fn(async () => [] as { id: string; name: string }[]),
  getCuratedByIdMock: vi.fn(),
  getCampaignProspectMock: vi.fn(),
}))

vi.mock('./db', () => ({
  isDatabaseConfigured: () => true,
  query: (...args: unknown[]) => queryMock(...args),
}))
vi.mock('./kv', () => ({ getCuratedById: getCuratedByIdMock }))
vi.mock('./campaign-prospects', () => ({ getCampaignProspect: getCampaignProspectMock }))

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
  })

  it('reads an existing listing and never writes one', async () => {
    await findExistingListingMatches({
      name: 'Geek Company',
      email: 'Geek@Example.com',
      phone: '(770) 555-0101',
      city: 'Acworth, GA',
    })
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]
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
    const sql = (queryMock.mock.calls[0] as [string])[0]
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
})
