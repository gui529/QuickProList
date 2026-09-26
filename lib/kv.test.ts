import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Business } from './yelp'

// Mock the Supabase client so we can test lib/kv.ts's real query-building
// logic (not just the in-memory double) without a live Supabase project.
const { upsertMock, fromMock, createClientMock } = vi.hoisted(() => {
  const upsertMock = vi.fn().mockResolvedValue({ error: null })
  const fromMock = vi.fn(() => ({ upsert: upsertMock }))
  const createClientMock = vi.fn(() => ({ from: fromMock }))
  return { upsertMock, fromMock, createClientMock }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

import { addCuratedFromYelp } from './kv'

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
