import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Business } from './yelp'

const { getCuratedInArea, getCuratedById, incrementSearchImpression } = vi.hoisted(() => ({
  getCuratedInArea: vi.fn(),
  getCuratedById: vi.fn(),
  incrementSearchImpression: vi.fn().mockResolvedValue(undefined),
}))

const { searchBusinesses, getBusinessById } = vi.hoisted(() => ({
  searchBusinesses: vi.fn(),
  getBusinessById: vi.fn(),
}))

vi.mock('./kv', () => ({
  getCuratedInArea,
  getCuratedById,
  incrementSearchImpression,
}))

vi.mock('./yelp', () => ({
  searchBusinesses,
  getBusinessById,
}))

import { getMergedResults, MAX_RESULTS } from './search'

function makeBusiness(overrides: Partial<Business> & { id: string }): Business {
  return {
    source: 'yelp',
    name: `Business ${overrides.id}`,
    rating: 4.5,
    reviewCount: 10,
    phone: '555-0100',
    address: '123 Main St',
    imageUrl: '',
    url: '',
    categories: [],
    ...overrides,
  }
}

/** Yelp returns at most `limit` businesses from the front of the match list. */
function mockYelpSearch(matches: Business[]) {
  searchBusinesses.mockImplementation(
    async (_where: unknown, _category: unknown, _term: unknown, limit = 20) =>
      matches.slice(0, limit)
  )
}

describe('getMergedResults', () => {
  beforeEach(() => {
    getCuratedInArea.mockReset()
    getCuratedById.mockReset()
    searchBusinesses.mockReset()
    getBusinessById.mockReset()
    incrementSearchImpression.mockReset().mockResolvedValue(undefined)
  })

  it('fills results from curated first, then Yelp for the remainder', async () => {
    const curated = [makeBusiness({ id: 'curated-1', source: 'manual' })]
    const yelp = [
      makeBusiness({ id: 'yelp-1' }),
      makeBusiness({ id: 'yelp-2' }),
      makeBusiness({ id: 'yelp-3' }),
      makeBusiness({ id: 'yelp-4' }),
    ]
    getCuratedInArea.mockResolvedValue(curated)
    mockYelpSearch(yelp)

    const results = await getMergedResults({ location: 'Marietta, GA' }, 'plumbing')

    expect(results[0].id).toBe('curated-1')
    expect(results.slice(1).map((b) => b.id)).toEqual(['yelp-1', 'yelp-2'])
    expect(results).toHaveLength(MAX_RESULTS)
    expect(searchBusinesses).toHaveBeenCalledTimes(1)
  })

  it('caps merged results at MAX_RESULTS even when Yelp returns more', async () => {
    const curated: Business[] = []
    const yelp = Array.from({ length: 10 }, (_, i) => makeBusiness({ id: `yelp-${i}` }))
    getCuratedInArea.mockResolvedValue(curated)
    mockYelpSearch(yelp)

    const results = await getMergedResults({ location: 'Marietta, GA' }, 'plumbing')

    expect(results).toHaveLength(MAX_RESULTS)
  })

  it('does not call Yelp when curated results already fill the target size', async () => {
    const curated = Array.from({ length: MAX_RESULTS }, (_, i) =>
      makeBusiness({ id: `curated-${i}`, source: 'manual' })
    )
    getCuratedInArea.mockResolvedValue(curated)
    searchBusinesses.mockResolvedValue([])

    const results = await getMergedResults({ location: 'Marietta, GA' }, 'plumbing')

    expect(results).toHaveLength(MAX_RESULTS)
    expect(searchBusinesses).not.toHaveBeenCalled()
  })

  it('deduplicates highlightId against curated/Yelp results and pins it first', async () => {
    const highlighted = makeBusiness({ id: 'yelp-2', name: 'Highlighted Pro' })
    const curated: Business[] = []
    const yelp = [
      makeBusiness({ id: 'yelp-1' }),
      highlighted,
      makeBusiness({ id: 'yelp-3' }),
      makeBusiness({ id: 'yelp-4' }),
      makeBusiness({ id: 'yelp-5' }),
    ]
    getCuratedInArea.mockResolvedValue(curated)
    mockYelpSearch(yelp)
    getBusinessById.mockResolvedValue(highlighted)

    const results = await getMergedResults(
      { location: 'Marietta, GA' },
      'plumbing',
      { highlightId: 'yelp-2' }
    )

    expect(results.map((b) => b.id)).toEqual(['yelp-2', 'yelp-1', 'yelp-3'])
    const occurrences = results.filter((b) => b.id === 'yelp-2')
    expect(occurrences).toHaveLength(1)
    expect(results).toHaveLength(MAX_RESULTS)
  })

  it('increments the search-impression counter for curated businesses returned in results, but not Yelp fill-ins', async () => {
    const curatedId = '11111111-1111-1111-1111-111111111111'
    const curated = [makeBusiness({ id: curatedId, source: 'manual' })]
    const yelp = [makeBusiness({ id: 'yelp-1' }), makeBusiness({ id: 'yelp-2' })]
    getCuratedInArea.mockResolvedValue(curated)
    mockYelpSearch(yelp)

    await getMergedResults({ location: 'Marietta, GA' }, 'plumbing')

    expect(incrementSearchImpression).toHaveBeenCalledTimes(1)
    expect(incrementSearchImpression).toHaveBeenCalledWith(curatedId)
  })

  it('fills exactly 3 from later names in one Yelp response when the first three matches are duplicates', async () => {
    const curated = [
      makeBusiness({ id: 'curated-1', source: 'manual', yelpId: 'yelp-1' }),
      makeBusiness({
        id: '22222222-2222-2222-2222-222222222222',
        source: 'manual',
        yelpId: 'yelp-2',
      }),
    ]
    const highlighted = curated[1]
    const yelp = [
      makeBusiness({ id: 'yelp-1' }),
      makeBusiness({ id: 'yelp-2' }),
      makeBusiness({ id: 'yelp-1' }),
      makeBusiness({ id: 'yelp-4' }),
      makeBusiness({ id: 'yelp-5' }),
    ]
    getCuratedInArea.mockResolvedValue(curated)
    getCuratedById.mockResolvedValue(highlighted)
    mockYelpSearch(yelp)

    const results = await getMergedResults({ location: 'Marietta, GA' }, 'plumbing', {
      highlightId: highlighted.id,
    })

    expect(searchBusinesses).toHaveBeenCalledTimes(1)
    expect(searchBusinesses.mock.calls[0]).toHaveLength(4)
    expect(searchBusinesses.mock.calls[0][3]).toBeGreaterThan(MAX_RESULTS)
    expect(results.map((b) => b.id)).toEqual([highlighted.id, 'curated-1', 'yelp-4'])
    expect(results).toHaveLength(MAX_RESULTS)
    expect(yelp.slice(0, MAX_RESULTS).map((b) => b.id)).not.toContain('yelp-4')
    expect(new Set(results.map((b) => b.id)).size).toBe(results.length)
  })

  it('returns fewer than 3 when one Yelp response runs out of real matches, without padding or repeats', async () => {
    const curated = [
      makeBusiness({ id: 'curated-1', source: 'manual', yelpId: 'yelp-1' }),
    ]
    const yelp = [
      makeBusiness({ id: 'yelp-1' }),
      makeBusiness({ id: 'yelp-1' }),
      makeBusiness({ id: 'yelp-1' }),
      makeBusiness({ id: 'yelp-2' }),
    ]
    getCuratedInArea.mockResolvedValue(curated)
    mockYelpSearch(yelp)

    const results = await getMergedResults({ location: 'Marietta, GA' }, 'plumbing')

    expect(searchBusinesses).toHaveBeenCalledTimes(1)
    expect(searchBusinesses.mock.calls[0]).toHaveLength(4)
    expect(searchBusinesses.mock.calls[0][3]).toBeGreaterThan(MAX_RESULTS)
    expect(results.map((b) => b.id)).toEqual(['curated-1', 'yelp-2'])
    expect(results.length).toBeLessThan(MAX_RESULTS)
    expect(new Set(results.map((b) => b.id)).size).toBe(results.length)
  })

  it('shows a Kennesaw pro in a Marietta search and asks Yelp once about Marietta only', async () => {
    const kennesawPro = makeBusiness({
      id: 'curated-kennesaw',
      source: 'manual',
      cities: ['kennesaw'],
    })
    getCuratedInArea.mockResolvedValue([kennesawPro])
    mockYelpSearch([makeBusiness({ id: 'yelp-1' }), makeBusiness({ id: 'yelp-2' }), makeBusiness({ id: 'yelp-3' })])

    const results = await getMergedResults({ location: 'Marietta' }, 'plumbing')

    expect(getCuratedInArea).toHaveBeenCalledWith('plumbing', ['acworth', 'kennesaw', 'marietta', 'woodstock'])
    expect(results.map((b) => b.id)).toEqual(['curated-kennesaw', 'yelp-1', 'yelp-2'])
    expect(searchBusinesses).toHaveBeenCalledTimes(1)
    expect(searchBusinesses.mock.calls[0][0]).toEqual({ location: 'Marietta, GA' })
  })

  it.each(['Smyrna, GA', 'Atlanta, GA', 'Canton', 'Marietta, OH'])(
    'returns nothing and calls neither curated nor Yelp for %s',
    async (location) => {
      const results = await getMergedResults({ location }, 'plumbing')

      expect(results).toEqual([])
      expect(getCuratedInArea).not.toHaveBeenCalled()
      expect(searchBusinesses).not.toHaveBeenCalled()
    }
  )
})
