import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Business } from './business'

const { getCuratedInArea, getCuratedById, incrementSearchImpression } = vi.hoisted(() => ({
  getCuratedInArea: vi.fn(),
  getCuratedById: vi.fn(),
  incrementSearchImpression: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./kv', () => ({
  getCuratedInArea,
  getCuratedById,
  incrementSearchImpression,
}))

import { getMergedResults, MAX_RESULTS } from './search'

function makeBusiness(overrides: Partial<Business> & { id: string }): Business {
  return {
    source: 'manual',
    name: `Business ${overrides.id}`,
    rating: null,
    reviewCount: null,
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
    getCuratedInArea.mockReset()
    getCuratedById.mockReset()
    incrementSearchImpression.mockReset().mockResolvedValue(undefined)
  })

  it('returns only manually entered pros, capped at MAX_RESULTS', async () => {
    const curated = [
      makeBusiness({ id: 'manual-1' }),
      makeBusiness({ id: 'manual-2' }),
      makeBusiness({ id: 'manual-3' }),
      makeBusiness({ id: 'manual-4' }),
      makeBusiness({ id: 'yelp-row', source: 'yelp', yelpId: 'yelp-1', rating: 4.5, reviewCount: 10 }),
    ]
    getCuratedInArea.mockResolvedValue(curated)

    const results = await getMergedResults({ location: 'Marietta, GA' }, 'plumbing')

    expect(results.map((b) => b.id)).toEqual(['manual-1', 'manual-2', 'manual-3'])
    expect(results).toHaveLength(MAX_RESULTS)
    expect(results.every((b) => b.source === 'manual')).toBe(true)
  })

  it('returns a short list when fewer than MAX_RESULTS manual pros exist', async () => {
    getCuratedInArea.mockResolvedValue([makeBusiness({ id: 'manual-1' })])

    const results = await getMergedResults({ location: 'Kennesaw' }, 'plumbing')

    expect(results.map((b) => b.id)).toEqual(['manual-1'])
    expect(results.length).toBeLessThan(MAX_RESULTS)
  })

  it('returns an empty list when the only stored pros were snapshotted from Yelp', async () => {
    getCuratedInArea.mockResolvedValue([
      makeBusiness({ id: 'yelp-row', source: 'yelp', yelpId: 'yelp-1' }),
    ])

    const results = await getMergedResults({ location: 'Acworth, GA' }, 'plumbing')

    expect(results).toEqual([])
  })

  it('pins a manual highlight first and does not duplicate it', async () => {
    const highlighted = makeBusiness({
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Highlighted Pro',
    })
    getCuratedInArea.mockResolvedValue([
      makeBusiness({ id: 'manual-1' }),
      highlighted,
      makeBusiness({ id: 'manual-3' }),
      makeBusiness({ id: 'manual-4' }),
    ])
    getCuratedById.mockResolvedValue(highlighted)

    const results = await getMergedResults({ location: 'Marietta, GA' }, 'plumbing', {
      highlightId: highlighted.id,
    })

    expect(results.map((b) => b.id)).toEqual([highlighted.id, 'manual-1', 'manual-3'])
    expect(results.filter((b) => b.id === highlighted.id)).toHaveLength(1)
    expect(results).toHaveLength(MAX_RESULTS)
  })

  it('does not pin a Yelp id or a Yelp-sourced row', async () => {
    const yelpRow = makeBusiness({
      id: '33333333-3333-3333-3333-333333333333',
      source: 'yelp',
      yelpId: 'yelp-2',
    })
    getCuratedInArea.mockResolvedValue([makeBusiness({ id: 'manual-1' }), yelpRow])
    getCuratedById.mockResolvedValue(yelpRow)

    const byYelpId = await getMergedResults({ location: 'Woodstock' }, 'plumbing', {
      highlightId: 'yelp-2',
    })
    expect(byYelpId.map((b) => b.id)).toEqual(['manual-1'])
    expect(getCuratedById).not.toHaveBeenCalled()

    const byUuid = await getMergedResults({ location: 'Woodstock' }, 'plumbing', {
      highlightId: yelpRow.id,
    })
    expect(byUuid.map((b) => b.id)).toEqual(['manual-1'])
  })

  it('increments the search-impression counter for manual pros that are shown', async () => {
    const curatedId = '11111111-1111-1111-1111-111111111111'
    getCuratedInArea.mockResolvedValue([
      makeBusiness({ id: curatedId }),
      makeBusiness({ id: 'not-a-uuid' }),
    ])

    await getMergedResults({ location: 'Marietta, GA' }, 'plumbing')

    expect(incrementSearchImpression).toHaveBeenCalledTimes(1)
    expect(incrementSearchImpression).toHaveBeenCalledWith(curatedId)
  })

  it('shows a Kennesaw pro in a Marietta search from the shared open-town pool', async () => {
    const kennesawPro = makeBusiness({
      id: 'curated-kennesaw',
      cities: ['kennesaw'],
    })
    getCuratedInArea.mockResolvedValue([kennesawPro])

    const results = await getMergedResults({ location: 'Marietta' }, 'plumbing')

    expect(getCuratedInArea).toHaveBeenCalledWith('plumbing', ['acworth', 'kennesaw', 'marietta', 'woodstock'])
    expect(results.map((b) => b.id)).toEqual(['curated-kennesaw'])
  })

  it.each(['Smyrna, GA', 'Atlanta, GA', 'Canton', 'Marietta, OH', 'Austin, TX'])(
    'returns nothing and does not read curated pros for %s',
    async (location) => {
      const results = await getMergedResults({ location }, 'plumbing')

      expect(results).toEqual([])
      expect(getCuratedInArea).not.toHaveBeenCalled()
    }
  )
})
