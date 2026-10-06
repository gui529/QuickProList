import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./kv', async () => import('./kv.test-double'))

import { __reset, __seed } from './kv.test-double'
import { getMergedResults, MAX_RESULTS } from './search'

const fetchMock = vi.fn()

beforeEach(() => {
  __reset()
  fetchMock.mockReset().mockRejectedValue(new Error('unexpected network request'))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function yelpRequests(): unknown[] {
  return fetchMock.mock.calls.filter(([url]) => String(url).includes('yelp'))
}

describe('getMergedResults', () => {
  it('shows a curated cleaner in Marietta, GA and makes no request to Yelp', async () => {
    const cleaner = __seed({ name: 'Sparkle Cleaners', category: 'homecleaning', cities: ['marietta'] })

    const results = await getMergedResults({ location: 'Marietta, GA' }, 'homecleaning')

    expect(results.map((b) => b.id)).toEqual([cleaner.id])
    expect(results[0].name).toBe('Sparkle Cleaners')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(yelpRequests()).toEqual([])
  })

  it('returns an empty list, not an error, when no pros match', async () => {
    __seed({ category: 'plumbing', cities: ['marietta'] })

    await expect(getMergedResults({ location: 'Marietta, GA' }, 'homecleaning')).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['Marietta, GA', 'homecleaning'],
    ['marietta', 'HomeCleaning'],
    ['  Marietta , Georgia ', ' homecleaning '],
    ['MARIETTA, ga', 'Cleaners'],
  ])('matches a stored Marietta cleaner for location %j and category %j', async (location, category) => {
    const cleaner = __seed({ category: 'homecleaning', cities: ['Marietta, GA'] })

    const results = await getMergedResults({ location }, category)

    expect(results.map((b) => b.id)).toEqual([cleaner.id])
  })

  it('shares one pool across opened towns, so a Kennesaw pro shows in a Marietta search', async () => {
    const pro = __seed({ category: 'plumbing', cities: ['kennesaw'] })

    const results = await getMergedResults({ location: 'Marietta' }, 'plumbing')

    expect(results.map((b) => b.id)).toEqual([pro.id])
  })

  it('renders legacy yelp-sourced rows from stored data without a live lookup', async () => {
    const legacy = __seed({
      source: 'yelp',
      yelp_id: 'legacy-yelp-id',
      name: 'Stored Plumbing',
      phone: '555-0100',
      category: 'plumbing',
      cities: ['marietta'],
    })

    const results = await getMergedResults({ location: 'Marietta' }, 'plumbing')

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ id: legacy.id, name: 'Stored Plumbing', phone: '555-0100' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('caps results at MAX_RESULTS', async () => {
    for (let i = 0; i < MAX_RESULTS + 3; i++) {
      __seed({ category: 'plumbing', cities: ['marietta'], name: `Pro ${i}` })
    }

    const results = await getMergedResults({ location: 'Marietta' }, 'plumbing')

    expect(results).toHaveLength(MAX_RESULTS)
  })

  it('pins a highlighted pro first without duplicating it', async () => {
    const pros = Array.from({ length: 4 }, (_, i) =>
      __seed({
        id: `00000000-0000-4000-8000-00000000000${i}`,
        category: 'plumbing',
        cities: ['marietta'],
        name: `Pro ${i}`,
      })
    )

    const results = await getMergedResults({ location: 'Marietta' }, 'plumbing', {
      highlightId: pros[2].id,
    })

    expect(results[0].id).toBe(pros[2].id)
    expect(results.filter((b) => b.id === pros[2].id)).toHaveLength(1)
    expect(results).toHaveLength(MAX_RESULTS)
  })

  it('ignores a non-UUID highlight instead of looking it up elsewhere', async () => {
    const pro = __seed({ category: 'plumbing', cities: ['marietta'] })

    const results = await getMergedResults({ location: 'Marietta' }, 'plumbing', {
      highlightId: 'some-old-yelp-id',
    })

    expect(results.map((b) => b.id)).toEqual([pro.id])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('skips delisted pros', async () => {
    __seed({ category: 'plumbing', cities: ['marietta'], delisted_at: new Date().toISOString() })

    await expect(getMergedResults({ location: 'Marietta' }, 'plumbing')).resolves.toEqual([])
  })

  it.each(['Smyrna, GA', 'Canton', 'Fair Oaks'])(
    'shares the opened-town pool for %s',
    async (location) => {
      const pro = __seed({ category: 'plumbing', cities: ['marietta'] })

      const results = await getMergedResults({ location }, 'plumbing')

      expect(results.map((b) => b.id)).toEqual([pro.id])
    }
  )

  it.each(['Atlanta, GA', 'Marietta, OH'])(
    'returns nothing for the unopened location %s',
    async (location) => {
      __seed({ category: 'plumbing', cities: ['marietta'] })

      await expect(getMergedResults({ location }, 'plumbing')).resolves.toEqual([])
    }
  )
})
