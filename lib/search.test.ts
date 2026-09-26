import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Business } from './yelp'

const { getCurated, getCuratedById, normalizeCity } = vi.hoisted(() => ({
  getCurated: vi.fn(),
  getCuratedById: vi.fn(),
  normalizeCity: (input: string) => input.trim().toLowerCase().split(',')[0].trim(),
}))

const { searchBusinesses, getBusinessById } = vi.hoisted(() => ({
  searchBusinesses: vi.fn(),
  getBusinessById: vi.fn(),
}))

vi.mock('./kv', () => ({
  getCurated,
  getCuratedById,
  normalizeCity,
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

describe('getMergedResults', () => {
  beforeEach(() => {
    getCurated.mockReset()
    getCuratedById.mockReset()
    searchBusinesses.mockReset()
    getBusinessById.mockReset()
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
    searchBusinesses.mockResolvedValue(yelp)

    const results = await getMergedResults({ location: 'Austin, TX' }, 'plumbing')

    expect(results[0].id).toBe('curated-1')
    expect(results.slice(1).map((b) => b.id)).toEqual(['yelp-1', 'yelp-2', 'yelp-3', 'yelp-4'])
    expect(searchBusinesses).toHaveBeenCalledTimes(1)
  })

  it('caps merged results at MAX_RESULTS even when Yelp returns more', async () => {
    const curated: Business[] = []
    const yelp = Array.from({ length: 10 }, (_, i) => makeBusiness({ id: `yelp-${i}` }))
    getCurated.mockResolvedValue(curated)
    searchBusinesses.mockResolvedValue(yelp)

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
    ]
    getCurated.mockResolvedValue(curated)
    searchBusinesses.mockResolvedValue(yelp)
    getBusinessById.mockResolvedValue(highlighted)

    const results = await getMergedResults(
      { location: 'Austin, TX' },
      'plumbing',
      { highlightId: 'yelp-2' }
    )

    expect(results[0].id).toBe('yelp-2')
    const occurrences = results.filter((b) => b.id === 'yelp-2')
    expect(occurrences).toHaveLength(1)
    expect(results).toHaveLength(3)
  })
})
