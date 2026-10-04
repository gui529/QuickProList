import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Business } from './yelp'

const { getCurated, getCuratedById, normalizeCity, incrementSearchImpression } = vi.hoisted(() => ({
  getCurated: vi.fn(),
  getCuratedById: vi.fn(),
  normalizeCity: (input: string) => input.trim().toLowerCase().split(',')[0].trim(),
  incrementSearchImpression: vi.fn().mockResolvedValue(undefined),
}))

const { searchBusinesses, getBusinessById } = vi.hoisted(() => ({
  searchBusinesses: vi.fn(),
  getBusinessById: vi.fn(),
}))

vi.mock('./kv', () => ({
  getCurated,
  getCuratedById,
  normalizeCity,
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
    getCurated.mockReset()
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
    getCurated.mockResolvedValue(curated)
    mockYelpSearch(yelp)

    const results = await getMergedResults({ location: 'Austin, TX' }, 'plumbing')

    expect(results[0].id).toBe('curated-1')
    expect(results.slice(1).map((b) => b.id)).toEqual(['yelp-1', 'yelp-2'])
    expect(results).toHaveLength(MAX_RESULTS)
    expect(searchBusinesses).toHaveBeenCalledTimes(1)
  })

  it('caps merged results at MAX_RESULTS even when Yelp returns more', async () => {
    const curated: Business[] = []
    const yelp = Array.from({ length: 10 }, (_, i) => makeBusiness({ id: `yelp-${i}` }))
    getCurated.mockResolvedValue(curated)
    mockYelpSearch(yelp)

    const results = await getMergedResults({ location: 'Austin, TX' }, 'plumbing')

    expect(results).toHaveLength(MAX_RESULTS)
  })

  it('does not call Yelp when curated results already fill the target size', async () => {
    const curated = Array.from({ length: MAX_RESULTS }, (_, i) =>
      makeBusiness({ id: `curated-${i}`, source: 'manual' })
    )
    getCurated.mockResolvedValue(curated)
    searchBusinesses.mockResolvedValue([])

    const results = await getMergedResults({ location: 'Austin, TX' }, 'plumbing')

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
    getCurated.mockResolvedValue(curated)
    mockYelpSearch(yelp)
    getBusinessById.mockResolvedValue(highlighted)

    const results = await getMergedResults(
      { location: 'Austin, TX' },
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
    getCurated.mockResolvedValue(curated)
    mockYelpSearch(yelp)

    await getMergedResults({ location: 'Austin, TX' }, 'plumbing')

    expect(incrementSearchImpression).toHaveBeenCalledTimes(1)
    expect(incrementSearchImpression).toHaveBeenCalledWith(curatedId)
  })

  it('returns exactly 3 with curated first when several curated businesses overlap the first Yelp page and more matches exist beyond it', async () => {
    const curated = [
      makeBusiness({ id: 'curated-1', source: 'manual', yelpId: 'yelp-1' }),
      makeBusiness({ id: 'curated-2', source: 'manual', yelpId: 'yelp-2' }),
    ]
    const yelp = [
      makeBusiness({ id: 'yelp-1' }),
      makeBusiness({ id: 'yelp-2' }),
      makeBusiness({ id: 'yelp-3' }),
      makeBusiness({ id: 'yelp-4' }),
      makeBusiness({ id: 'yelp-5' }),
    ]
    getCurated.mockResolvedValue(curated)
    mockYelpSearch(yelp)

    const results = await getMergedResults({ location: 'Austin, TX' }, 'plumbing')

    expect(searchBusinesses).toHaveBeenCalledWith(
      { location: 'Austin, TX' },
      'plumbing',
      'plumber',
      MAX_RESULTS
    )
    expect(results.map((b) => b.id)).toEqual(['curated-1', 'curated-2', 'yelp-3'])
    expect(results).toHaveLength(MAX_RESULTS)
    expect(new Set(results.map((b) => b.id)).size).toBe(results.length)
  })

  it('returns exactly 3 after dropping a highlighted business and curated duplicates when more Yelp matches exist beyond the first page', async () => {
    const curated = [
      makeBusiness({
        id: '11111111-1111-1111-1111-111111111111',
        source: 'manual',
        yelpId: 'yelp-1',
      }),
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
      makeBusiness({ id: 'yelp-3' }),
      makeBusiness({ id: 'yelp-4' }),
      makeBusiness({ id: 'yelp-5' }),
    ]
    getCurated.mockResolvedValue(curated)
    getCuratedById.mockResolvedValue(highlighted)
    mockYelpSearch(yelp)

    const results = await getMergedResults({ location: 'Austin, TX' }, 'plumbing', {
      highlightId: highlighted.id,
    })

    expect(results.map((b) => b.id)).toEqual([highlighted.id, curated[0].id, 'yelp-3'])
    expect(results).toHaveLength(MAX_RESULTS)
    expect(results.filter((b) => b.id === highlighted.id)).toHaveLength(1)
    expect(results.filter((b) => b.yelpId === 'yelp-1' || b.id === 'yelp-1')).toHaveLength(1)
  })

  it('returns fewer than 3 when dedupe leaves fewer real matches, without padding or repeats', async () => {
    const curated = [
      makeBusiness({ id: 'curated-1', source: 'manual', yelpId: 'yelp-1' }),
    ]
    const yelp = [makeBusiness({ id: 'yelp-1' }), makeBusiness({ id: 'yelp-2' })]
    getCurated.mockResolvedValue(curated)
    mockYelpSearch(yelp)

    const results = await getMergedResults({ location: 'Austin, TX' }, 'plumbing')

    expect(results.map((b) => b.id)).toEqual(['curated-1', 'yelp-2'])
    expect(results.length).toBeLessThan(MAX_RESULTS)
    expect(new Set(results.map((b) => b.id)).size).toBe(results.length)
  })
})
