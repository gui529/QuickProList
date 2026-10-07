import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Business } from './business'

const { queryMock, selectState } = vi.hoisted(() => {
  const selectState: { rows: Record<string, unknown>[] } = { rows: [] }
  const queryMock = vi.fn(async () => selectState.rows)
  return { queryMock, selectState }
})

vi.mock('./db', () => ({
  isDatabaseConfigured: () => Boolean(process.env.DATABASE_URL),
  query: (...args: unknown[]) => queryMock(...args),
}))

import {
  addCuratedFromYelp,
  incrementProfileView,
  incrementContactClick,
  getCuratedByDashboardToken,
  getCuratedById,
  updateCuratedByDashboardToken,
} from './kv'

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: 'yelp-1',
    source: 'yelp',
    name: 'Acme Plumbing',
    rating: 4.5,
    reviewCount: 10,
    phone: '555-1234',
    address: '123 Main St',
    imageUrl: 'https://example.test/photo.jpg',
    url: 'https://www.yelp.com/biz/yelp-1',
    categories: ['Plumbing'],
    ...overrides,
  }
}

describe('addCuratedFromYelp (lib/kv.ts)', () => {
  beforeEach(() => {
    queryMock.mockClear()
    process.env.DATABASE_URL = 'postgres://test'
  })

  it('stores every city passed in, not just the first, for a multi-city invitation', async () => {
    await addCuratedFromYelp(makeBusiness(), 'plumbing', [
      'Austin, TX',
      'Dallas, TX',
      'Houston, TX',
    ])

    expect(queryMock).toHaveBeenCalledTimes(1)
    const params = queryMock.mock.calls[0][1] as unknown[]
    expect(params[2]).toEqual(['austin', 'dallas', 'houston'])
  })

  it('normalizes and de-dupes city names', async () => {
    await addCuratedFromYelp(makeBusiness(), 'plumbing', [
      'Austin, TX',
      'austin,  tx',
      'Dallas, TX',
    ])

    const params = queryMock.mock.calls[0][1] as unknown[]
    expect(params[2]).toEqual(['austin', 'dallas'])
  })

  it('throws when no valid city is provided', async () => {
    await expect(addCuratedFromYelp(makeBusiness(), 'plumbing', [])).rejects.toThrow(
      'At least one city is required'
    )
    expect(queryMock).not.toHaveBeenCalled()
  })
})

describe('incrementProfileView / incrementContactClick (lib/kv.ts)', () => {
  beforeEach(() => {
    queryMock.mockClear()
    process.env.DATABASE_URL = 'postgres://test'
  })

  it('increments profile_views in one update', async () => {
    await incrementProfileView('curated-1')

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('profile_views'), ['curated-1'])
  })

  it('increments the correct column for each contact click type', async () => {
    await incrementContactClick('curated-1', 'phone')
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('phone_clicks'), ['curated-1'])

    await incrementContactClick('curated-1', 'website')
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('website_clicks'), ['curated-1'])

    await incrementContactClick('curated-1', 'directions')
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('directions_clicks'), ['curated-1'])
  })

  it('does not query when the database is not configured', async () => {
    delete process.env.DATABASE_URL

    await incrementProfileView('missing')

    expect(queryMock).not.toHaveBeenCalled()
  })
})

describe('getCuratedByDashboardToken (lib/kv.ts)', () => {
  beforeEach(() => {
    queryMock.mockClear()
    selectState.rows = []
    process.env.DATABASE_URL = 'postgres://test'
  })

  it('returns the mapped dashboard data for a matching token', async () => {
    selectState.rows = [{
      id: 'curated-1',
      name: 'Acme Plumbing',
      source: 'yelp',
      is_trial: false,
      trial_ends_at: null,
      profile_views: 12,
      phone_clicks: 4,
      website_clicks: 2,
      directions_clicks: 1,
      search_impressions: 25,
      website_url: 'https://acme-plumbing.example',
      contact_email: 'owner@acme-plumbing.example',
      review_url: null,
    }]

    const result = await getCuratedByDashboardToken('good-token')

    expect(result).toEqual({
      id: 'curated-1',
      name: 'Acme Plumbing',
      source: 'yelp',
      isTrial: false,
      trialEndsAt: null,
      profileViews: 12,
      phoneClicks: 4,
      websiteClicks: 2,
      directionsClicks: 1,
      searchImpressions: 25,
      websiteUrl: 'https://acme-plumbing.example',
      contactEmail: 'owner@acme-plumbing.example',
      reviewUrl: null,
    })
  })

  it('defaults missing counters to 0', async () => {
    selectState.rows = [{
      id: 'curated-1',
      name: 'Acme Plumbing',
      source: 'manual',
      is_trial: false,
      trial_ends_at: null,
    }]

    const result = await getCuratedByDashboardToken('good-token')

    expect(result).toMatchObject({
      profileViews: 0,
      phoneClicks: 0,
      websiteClicks: 0,
      directionsClicks: 0,
      searchImpressions: 0,
      websiteUrl: null,
      contactEmail: null,
      reviewUrl: null,
    })
  })

  it('returns null for an unknown token', async () => {
    selectState.rows = []

    const result = await getCuratedByDashboardToken('bogus-token')

    expect(result).toBeNull()
  })

  it('returns null when the database is not configured', async () => {
    delete process.env.DATABASE_URL

    const result = await getCuratedByDashboardToken('any-token')

    expect(result).toBeNull()
  })
})

describe('reviewUrl derivation (lib/kv.ts)', () => {
  beforeEach(() => {
    queryMock.mockClear()
    selectState.rows = []
    process.env.DATABASE_URL = 'postgres://test'
  })

  it('does not derive a Yelp write-a-review link for a legacy yelp row without a review_url', async () => {
    selectState.rows = [{
      id: 'curated-1',
      source: 'yelp',
      yelp_id: 'yelp-biz-1',
      review_url: null,
      name: 'Acme Plumbing',
      category: 'plumbing',
      cities: [],
      categories: [],
      is_trial: false,
    }]

    const result = await getCuratedById('curated-1')

    expect(result?.reviewUrl).toBeUndefined()
    expect(result?.url).toBe('')
  })

  it('returns a stored review_url unchanged for a manual business', async () => {
    selectState.rows = [{
      id: 'curated-2',
      source: 'manual',
      yelp_id: null,
      review_url: 'https://g.page/r/example/review',
      name: 'Bob Roofing',
      category: 'roofing',
      cities: [],
      categories: [],
      is_trial: false,
    }]

    const result = await getCuratedById('curated-2')

    expect(result?.reviewUrl).toBe('https://g.page/r/example/review')
  })

  it('returns undefined (not a broken link) when no review_url is stored', async () => {
    selectState.rows = [{
      id: 'curated-3',
      source: 'manual',
      yelp_id: null,
      review_url: null,
      name: 'Carol Painting',
      category: 'painting',
      cities: [],
      categories: [],
      is_trial: false,
    }]

    const result = await getCuratedById('curated-3')

    expect(result?.reviewUrl).toBeUndefined()
  })
})

describe('updateCuratedByDashboardToken (lib/kv.ts)', () => {
  beforeEach(() => {
    queryMock.mockClear()
    selectState.rows = [{ id: 'curated-1' }]
    process.env.DATABASE_URL = 'postgres://test'
  })

  it('updates only the allow-listed fields for a valid token', async () => {
    const result = await updateCuratedByDashboardToken('good-token', {
      websiteUrl: 'https://example.com',
      contactEmail: 'owner@example.com',
    })

    expect(result).toBe(true)
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('website_url'),
      ['https://example.com', 'owner@example.com', 'good-token']
    )
  })

  it('trims whitespace and stores an empty value as null', async () => {
    await updateCuratedByDashboardToken('good-token', { reviewUrl: '   ' })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('review_url'), [null, 'good-token'])
  })

  it('sanitizes a javascript: URI in websiteUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: 'javascript:alert(1)',
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('website_url'), [null, 'good-token'])
  })

  it('sanitizes a javascript: URI in reviewUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      reviewUrl: 'javascript:alert(document.cookie)',
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('review_url'), [null, 'good-token'])
  })

  it('sanitizes a tab-obfuscated javascript: URI in websiteUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: 'java\tscript:alert(1)',
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('website_url'), [null, 'good-token'])
  })

  it('sanitizes a newline-obfuscated javascript: URI in reviewUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      reviewUrl: 'java\nscript:alert(document.cookie)',
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('review_url'), [null, 'good-token'])
  })

  it('sanitizes a carriage-return-obfuscated javascript: URI in websiteUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: 'java\rscript:alert(1)',
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('website_url'), [null, 'good-token'])
  })

  it('sanitizes a javascript: URI split across multiple embedded control characters to null', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: 'j\ta\nv\ra\tscript:alert(1)',
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('website_url'), [null, 'good-token'])
  })

  it('sanitizes a leading-\\x01-obfuscated javascript: URI in websiteUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: '\x01javascript:alert(1)',
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('website_url'), [null, 'good-token'])
  })

  it('sanitizes a leading-\\x00-obfuscated javascript: URI in websiteUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: '\x00javascript:alert(1)',
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('website_url'), [null, 'good-token'])
  })

  it('sanitizes a leading-\\x1f-obfuscated javascript: URI in reviewUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      reviewUrl: '\x1fjavascript:alert(1)',
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('review_url'), [null, 'good-token'])
  })

  it('still saves a normal https:// URL for websiteUrl and reviewUrl', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: 'https://acme-plumbing.example',
      reviewUrl: 'https://g.page/r/abc/review',
    })

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('website_url'), [
      'https://acme-plumbing.example',
      'https://g.page/r/abc/review',
      'good-token',
    ])
  })

  it('returns false and reports no match for an unknown token', async () => {
    selectState.rows = []

    const result = await updateCuratedByDashboardToken('bogus-token', {
      websiteUrl: 'https://example.com',
    })

    expect(result).toBe(false)
  })

  it('returns false when the database is not configured', async () => {
    delete process.env.DATABASE_URL

    const result = await updateCuratedByDashboardToken('any-token', {
      websiteUrl: 'https://example.com',
    })

    expect(result).toBe(false)
    expect(queryMock).not.toHaveBeenCalled()
  })
})
