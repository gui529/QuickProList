import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Business } from './business'

// Mock the Supabase client so we can test lib/kv.ts's real query-building
// logic (not just the in-memory double) without a live Supabase project.
const { upsertMock, fromMock, createClientMock, selectState, updateMock, updateEqMock, updateSelectState } =
  vi.hoisted(() => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    // Mutable holder so tests can control what update(...).eq(...).select(...) resolves to
    // (used by the update-by-token path, which needs to know how many rows matched).
    const updateSelectState: { data: Array<{ id: string }> | null } = { data: [{ id: 'curated-1' }] }
    const updateEqMock = vi.fn().mockReturnValue({
      error: null,
      select: vi.fn().mockImplementation(async () => ({ data: updateSelectState.data, error: null })),
    })
    const updateMock = vi.fn().mockReturnValue({
      eq: updateEqMock,
    })
    // Mutable holder so tests can control what the chained select().eq().maybeSingle() resolves to.
    const selectState: { data: Record<string, unknown> | null } = { data: null }
    const fromMock = vi.fn(() => ({
      upsert: upsertMock,
      update: updateMock,
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockImplementation(async () => ({ data: selectState.data })),
        })),
      })),
    }))
    const createClientMock = vi.fn(() => ({ from: fromMock }))
    return { upsertMock, fromMock, createClientMock, selectState, updateMock, updateEqMock, updateSelectState }
  })

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
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
    upsertMock.mockClear()
    fromMock.mockClear()
    createClientMock.mockClear()
    process.env.SUPABASE_URL = 'https://example.test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('stores every city passed in, not just the first, for a multi-city invitation', async () => {
    await addCuratedFromYelp(makeBusiness(), 'plumbing', [
      'Acworth, GA',
      'Kennesaw, GA',
      'Marietta, GA',
    ])

    expect(upsertMock).toHaveBeenCalledTimes(1)
    const payload = upsertMock.mock.calls[0][0]
    expect(payload.cities).toEqual(['acworth', 'kennesaw', 'marietta'])
  })

  it('normalizes and de-dupes city names', async () => {
    await addCuratedFromYelp(makeBusiness(), 'plumbing', [
      'Kennesaw, GA',
      'kennesaw,  ga',
      'Marietta, GA',
    ])

    const payload = upsertMock.mock.calls[0][0]
    expect(payload.cities).toEqual(['kennesaw', 'marietta'])
  })

  it('throws when no valid city is provided', async () => {
    await expect(addCuratedFromYelp(makeBusiness(), 'plumbing', [])).rejects.toThrow(
      'At least one city is required'
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })
})

describe('incrementProfileView / incrementContactClick (lib/kv.ts)', () => {
  beforeEach(() => {
    fromMock.mockClear()
    updateMock.mockClear()
    createClientMock.mockClear()
    selectState.data = null
    process.env.SUPABASE_URL = 'https://example.test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('reads the current profile_views count and writes back current+1', async () => {
    selectState.data = { profile_views: 4 }

    await incrementProfileView('curated-1')

    expect(updateMock).toHaveBeenCalledWith({ profile_views: 5 })
  })

  it('treats a missing count as 0', async () => {
    selectState.data = { profile_views: 0 }

    await incrementProfileView('curated-1')

    expect(updateMock).toHaveBeenCalledWith({ profile_views: 1 })
  })

  it('increments the correct column for each contact click type', async () => {
    selectState.data = { phone_clicks: 2 }
    await incrementContactClick('curated-1', 'phone')
    expect(updateMock).toHaveBeenCalledWith({ phone_clicks: 3 })

    selectState.data = { website_clicks: 7 }
    await incrementContactClick('curated-1', 'website')
    expect(updateMock).toHaveBeenCalledWith({ website_clicks: 8 })

    selectState.data = { directions_clicks: 0 }
    await incrementContactClick('curated-1', 'directions')
    expect(updateMock).toHaveBeenCalledWith({ directions_clicks: 1 })
  })

  it('is a no-op when the row is not found', async () => {
    selectState.data = null

    await incrementProfileView('missing')

    expect(updateMock).not.toHaveBeenCalled()
  })
})

describe('getCuratedByDashboardToken (lib/kv.ts)', () => {
  beforeEach(() => {
    fromMock.mockClear()
    selectState.data = null
    process.env.SUPABASE_URL = 'https://example.test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('returns the mapped dashboard data for a matching token', async () => {
    selectState.data = {
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
    }

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
    selectState.data = {
      id: 'curated-1',
      name: 'Acme Plumbing',
      source: 'manual',
      is_trial: false,
      trial_ends_at: null,
    }

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
    selectState.data = null

    const result = await getCuratedByDashboardToken('bogus-token')

    expect(result).toBeNull()
  })

  it('returns null when Supabase is not configured', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const result = await getCuratedByDashboardToken('any-token')

    expect(result).toBeNull()
  })
})

describe('reviewUrl derivation (lib/kv.ts)', () => {
  beforeEach(() => {
    fromMock.mockClear()
    selectState.data = null
    process.env.SUPABASE_URL = 'https://example.test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('derives the Yelp write-a-review link when no explicit review_url is set', async () => {
    selectState.data = {
      id: 'curated-1',
      source: 'yelp',
      yelp_id: 'yelp-biz-1',
      review_url: null,
      name: 'Acme Plumbing',
      category: 'plumbing',
      cities: [],
      categories: [],
      is_trial: false,
    }

    const result = await getCuratedById('curated-1')

    expect(result?.reviewUrl).toBe('https://www.yelp.com/writeareview/biz/yelp-biz-1')
  })

  it('returns a stored review_url unchanged for a manual business', async () => {
    selectState.data = {
      id: 'curated-2',
      source: 'manual',
      yelp_id: null,
      review_url: 'https://g.page/r/example/review',
      name: 'Bob Roofing',
      category: 'roofing',
      cities: [],
      categories: [],
      is_trial: false,
    }

    const result = await getCuratedById('curated-2')

    expect(result?.reviewUrl).toBe('https://g.page/r/example/review')
  })

  it('returns undefined (not a broken link) when neither a stored review_url nor a Yelp id exists', async () => {
    selectState.data = {
      id: 'curated-3',
      source: 'manual',
      yelp_id: null,
      review_url: null,
      name: 'Carol Painting',
      category: 'painting',
      cities: [],
      categories: [],
      is_trial: false,
    }

    const result = await getCuratedById('curated-3')

    expect(result?.reviewUrl).toBeUndefined()
  })
})

describe('updateCuratedByDashboardToken (lib/kv.ts)', () => {
  beforeEach(() => {
    fromMock.mockClear()
    updateMock.mockClear()
    updateEqMock.mockClear()
    updateSelectState.data = [{ id: 'curated-1' }]
    process.env.SUPABASE_URL = 'https://example.test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('updates only the allow-listed fields for a valid token', async () => {
    const result = await updateCuratedByDashboardToken('good-token', {
      websiteUrl: 'https://example.com',
      contactEmail: 'owner@example.com',
    })

    expect(result).toBe(true)
    expect(updateMock).toHaveBeenCalledWith({
      website_url: 'https://example.com',
      contact_email: 'owner@example.com',
    })
    expect(updateEqMock).toHaveBeenCalledWith('dashboard_token', 'good-token')
  })

  it('trims whitespace and stores an empty value as null', async () => {
    await updateCuratedByDashboardToken('good-token', { reviewUrl: '   ' })

    expect(updateMock).toHaveBeenCalledWith({ review_url: null })
  })

  it('sanitizes a javascript: URI in websiteUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: 'javascript:alert(1)',
    })

    expect(updateMock).toHaveBeenCalledWith({ website_url: null })
  })

  it('sanitizes a javascript: URI in reviewUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      reviewUrl: 'javascript:alert(document.cookie)',
    })

    expect(updateMock).toHaveBeenCalledWith({ review_url: null })
  })

  it('sanitizes a tab-obfuscated javascript: URI in websiteUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: 'java\tscript:alert(1)',
    })

    expect(updateMock).toHaveBeenCalledWith({ website_url: null })
  })

  it('sanitizes a newline-obfuscated javascript: URI in reviewUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      reviewUrl: 'java\nscript:alert(document.cookie)',
    })

    expect(updateMock).toHaveBeenCalledWith({ review_url: null })
  })

  it('sanitizes a carriage-return-obfuscated javascript: URI in websiteUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: 'java\rscript:alert(1)',
    })

    expect(updateMock).toHaveBeenCalledWith({ website_url: null })
  })

  it('sanitizes a javascript: URI split across multiple embedded control characters to null', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: 'j\ta\nv\ra\tscript:alert(1)',
    })

    expect(updateMock).toHaveBeenCalledWith({ website_url: null })
  })

  it('sanitizes a leading-\\x01-obfuscated javascript: URI in websiteUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: '\x01javascript:alert(1)',
    })

    expect(updateMock).toHaveBeenCalledWith({ website_url: null })
  })

  it('sanitizes a leading-\\x00-obfuscated javascript: URI in websiteUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: '\x00javascript:alert(1)',
    })

    expect(updateMock).toHaveBeenCalledWith({ website_url: null })
  })

  it('sanitizes a leading-\\x1f-obfuscated javascript: URI in reviewUrl to null rather than storing it verbatim', async () => {
    await updateCuratedByDashboardToken('good-token', {
      reviewUrl: '\x1fjavascript:alert(1)',
    })

    expect(updateMock).toHaveBeenCalledWith({ review_url: null })
  })

  it('still saves a normal https:// URL for websiteUrl and reviewUrl', async () => {
    await updateCuratedByDashboardToken('good-token', {
      websiteUrl: 'https://acme-plumbing.example',
      reviewUrl: 'https://g.page/r/abc/review',
    })

    expect(updateMock).toHaveBeenCalledWith({
      website_url: 'https://acme-plumbing.example',
      review_url: 'https://g.page/r/abc/review',
    })
  })

  it('returns false and reports no match for an unknown token', async () => {
    updateSelectState.data = []

    const result = await updateCuratedByDashboardToken('bogus-token', {
      websiteUrl: 'https://example.com',
    })

    expect(result).toBe(false)
  })

  it('returns false when Supabase is not configured', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const result = await updateCuratedByDashboardToken('any-token', {
      websiteUrl: 'https://example.com',
    })

    expect(result).toBe(false)
    expect(updateMock).not.toHaveBeenCalled()
  })
})
