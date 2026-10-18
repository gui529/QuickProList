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

  it('shares the opened-town pool for Atlanta, GA', async () => {
    const pro = __seed({ category: 'plumbing', cities: ['marietta'] })
    const results = await getMergedResults({ location: 'Atlanta, GA' }, 'plumbing')
    expect(results.map((b) => b.id)).toEqual([pro.id])
  })

  it('labels a free preview as sponsored and leaves a manual directory row unlabeled', async () => {
    const preview = __seed({
      category: 'plumbing',
      cities: ['marietta'],
      name: 'Preview Plumbing',
      is_trial: true,
    })
    const manual = __seed({
      category: 'plumbing',
      cities: ['marietta'],
      name: 'Manual Plumbing',
      is_trial: false,
    })

    const results = await getMergedResults({ location: 'Marietta' }, 'plumbing')
    const byId = new Map(results.map((b) => [b.id, b.sponsored]))
    expect(byId.get(preview.id)).toBe(true)
    expect(byId.get(manual.id)).toBe(false)
  })

  it('returns nothing for an unopened location', async () => {
    __seed({ category: 'plumbing', cities: ['marietta'] })
    await expect(getMergedResults({ location: 'Marietta, OH' }, 'plumbing')).resolves.toEqual([])
  })

  it('ranks a town match ahead of an earlier pro from another opened town', async () => {
    const earlier = __seed({
      id: '00000000-0000-4000-8000-0000000000a1',
      category: 'plumbing',
      cities: ['kennesaw'],
      name: 'Kennesaw Pro',
      created_at: '2020-01-01T00:00:00.000Z',
    })
    const later = __seed({
      id: '00000000-0000-4000-8000-0000000000a2',
      category: 'plumbing',
      cities: ['marietta'],
      name: 'Marietta Pro',
      created_at: '2024-01-01T00:00:00.000Z',
    })

    const results = await getMergedResults({ location: 'Marietta, GA' }, 'plumbing')

    expect(results.map((b) => b.id)).toEqual([later.id, earlier.id])
  })

  it('backfills open slots from the rest of the area after town matches', async () => {
    const town = [0, 1].map((i) =>
      __seed({
        id: `00000000-0000-4000-8000-000000000b0${i}`,
        category: 'plumbing',
        cities: ['marietta'],
        name: `Town ${i}`,
        created_at: `2020-01-0${i + 1}T00:00:00.000Z`,
      })
    )
    const area = [0, 1, 2, 3].map((i) =>
      __seed({
        id: `00000000-0000-4000-8000-000000000c0${i}`,
        category: 'plumbing',
        cities: ['kennesaw'],
        name: `Area ${i}`,
        created_at: `2021-01-0${i + 1}T00:00:00.000Z`,
      })
    )

    const results = await getMergedResults({ location: 'Marietta' }, 'plumbing', {
      now: new Date('2026-01-01T00:30:00.000Z'),
    })

    expect(results).toHaveLength(MAX_RESULTS)
    expect(results.slice(0, 2).map((b) => b.id)).toEqual(town.map((b) => b.id))
    expect(area.map((b) => b.id)).toContain(results[2].id)
  })

  it('rotates six pros across hour buckets and leaves three or fewer in signup order', async () => {
    const six = Array.from({ length: 6 }, (_, i) =>
      __seed({
        id: `00000000-0000-4000-8000-000000000d0${i}`,
        category: 'plumbing',
        cities: ['marietta'],
        name: `Pro ${i}`,
        created_at: `2020-01-0${i + 1}T00:00:00.000Z`,
      })
    )
    const seen = new Set<string>()
    for (let hour = 0; hour < 72; hour++) {
      const now = new Date(Date.UTC(2026, 0, 1, hour, 15, 0))
      const once = await getMergedResults({ location: 'Marietta' }, 'plumbing', { now })
      const twice = await getMergedResults({ location: 'Marietta' }, 'plumbing', { now })
      const ids = once.map((b) => b.id)
      expect(twice.map((b) => b.id)).toEqual(ids)
      expect(ids).toHaveLength(MAX_RESULTS)
      for (const id of ids) seen.add(id)
    }
    expect([...seen].sort()).toEqual(six.map((b) => b.id).sort())

    __reset()
    const three = [0, 1, 2].map((i) =>
      __seed({
        id: `00000000-0000-4000-8000-000000000e0${i}`,
        category: 'plumbing',
        cities: ['marietta'],
        name: `Stable ${i}`,
        created_at: `2020-02-0${i + 1}T00:00:00.000Z`,
      })
    )
    const signupOrder = three.map((b) => b.id)
    const morning = await getMergedResults({ location: 'Marietta' }, 'plumbing', {
      now: new Date('2026-06-01T01:00:00.000Z'),
    })
    const evening = await getMergedResults({ location: 'Marietta' }, 'plumbing', {
      now: new Date('2026-06-01T18:00:00.000Z'),
    })
    expect(morning.map((b) => b.id)).toEqual(signupOrder)
    expect(evening.map((b) => b.id)).toEqual(signupOrder)
  })

  it('ignores a highlight that is not live and keeps a live highlight first', async () => {
    const live = __seed({
      id: '00000000-0000-4000-8000-000000000f01',
      category: 'plumbing',
      cities: ['marietta'],
      name: 'Live',
      created_at: '2020-01-01T00:00:00.000Z',
    })
    const delisted = __seed({
      id: '00000000-0000-4000-8000-000000000f02',
      category: 'plumbing',
      cities: ['marietta'],
      delisted_at: '2024-01-01T00:00:00.000Z',
    })
    const draft = __seed({
      id: '00000000-0000-4000-8000-000000000f03',
      category: 'plumbing',
      cities: ['marietta'],
      is_draft: true,
    })
    const expired = __seed({
      id: '00000000-0000-4000-8000-000000000f04',
      category: 'plumbing',
      cities: ['marietta'],
      is_trial: true,
      trial_ends_at: '2000-01-01T00:00:00.000Z',
    })
    const pinned = __seed({
      id: '00000000-0000-4000-8000-000000000f05',
      category: 'plumbing',
      cities: ['kennesaw'],
      name: 'Pinned',
      created_at: '2025-01-01T00:00:00.000Z',
    })

    for (const id of [delisted.id, draft.id, expired.id]) {
      const results = await getMergedResults({ location: 'Marietta' }, 'plumbing', { highlightId: id })
      expect(results.map((b) => b.id)).not.toContain(id)
      expect(results[0].id).toBe(live.id)
    }

    const highlighted = await getMergedResults({ location: 'Marietta' }, 'plumbing', {
      highlightId: pinned.id,
    })
    expect(highlighted[0].id).toBe(pinned.id)
    expect(highlighted.filter((b) => b.id === pinned.id)).toHaveLength(1)
    expect(highlighted.map((b) => b.id)).toContain(live.id)
  })
})
