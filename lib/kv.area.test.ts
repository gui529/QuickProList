import { describe, expect, it, vi, beforeEach } from 'vitest'

const { rowsState, fromMock } = vi.hoisted(() => {
  const rowsState: { data: Array<Record<string, unknown>> } = { data: [] }
  const query = {
    select: vi.fn(() => query),
    is: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(async () => ({ data: rowsState.data, error: null })),
  }
  const fromMock = vi.fn(() => query)
  return { rowsState, fromMock }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: fromMock })),
}))

import { getCurated, getCuratedInArea } from './kv'

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-1',
    source: 'manual',
    yelp_id: null,
    category: 'homecleaning',
    cities: ['marietta'],
    name: 'Sparkle Cleaners',
    categories: [],
    is_trial: false,
    ...overrides,
  }
}

describe('curated area lookups (lib/kv.ts)', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
    rowsState.data = []
  })

  it('matches category and city case-insensitively, ignoring whitespace and state suffixes', async () => {
    rowsState.data = [
      row({ id: 'a', category: 'HomeCleaning', cities: ['Marietta, GA'] }),
      row({ id: 'b', category: ' homecleaning ', cities: [' MARIETTA '] }),
      row({ id: 'c', category: 'plumbing', cities: ['marietta'] }),
      row({ id: 'd', cities: ['smyrna'] }),
    ]

    const single = await getCurated(' Cleaners ', 'Marietta, GA')
    const area = await getCuratedInArea('homecleaning', ['marietta', 'kennesaw'])

    expect(single.map((b) => b.id)).toEqual(['a', 'b'])
    expect(area.map((b) => b.id)).toEqual(['a', 'b'])
  })

  it('returns an empty list when Supabase has no matching rows', async () => {
    await expect(getCuratedInArea('homecleaning', ['marietta'])).resolves.toEqual([])
  })
})
