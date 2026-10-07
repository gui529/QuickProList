import { describe, expect, it, vi, beforeEach } from 'vitest'

const { rowsState, queryMock } = vi.hoisted(() => {
  const rowsState: { data: Array<Record<string, unknown>> } = { data: [] }
  const queryMock = vi.fn(async () => rowsState.data)
  return { rowsState, queryMock }
})

vi.mock('./db', () => ({
  isDatabaseConfigured: () => Boolean(process.env.DATABASE_URL),
  query: (...args: unknown[]) => queryMock(...args),
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
    process.env.DATABASE_URL = 'postgres://test'
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
