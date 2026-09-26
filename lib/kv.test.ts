import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Business } from './yelp'

// Mock the Supabase client so we can test lib/kv.ts's real query-building
// logic (not just the in-memory double) without a live Supabase project.
const { upsertMock, fromMock, createClientMock, selectState, updateMock } = vi.hoisted(() => {
  const upsertMock = vi.fn().mockResolvedValue({ error: null })
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })
  // Mutable holder so tests can control what the chained select().eq().maybeSingle() resolves to.
  const selectState: { data: Record<string, number> | null } = { data: null }
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
  return { upsertMock, fromMock, createClientMock, selectState, updateMock }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

import { addCuratedFromYelp, incrementProfileView, incrementContactClick } from './kv'

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
      'Austin, TX',
      'Dallas, TX',
      'Houston, TX',
    ])

    expect(upsertMock).toHaveBeenCalledTimes(1)
    const payload = upsertMock.mock.calls[0][0]
    expect(payload.cities).toEqual(['austin', 'dallas', 'houston'])
  })

  it('normalizes and de-dupes city names', async () => {
    await addCuratedFromYelp(makeBusiness(), 'plumbing', [
      'Austin, TX',
      'austin,  tx',
      'Dallas, TX',
    ])

    const payload = upsertMock.mock.calls[0][0]
    expect(payload.cities).toEqual(['austin', 'dallas'])
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
