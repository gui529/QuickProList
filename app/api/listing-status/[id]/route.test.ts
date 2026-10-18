import { beforeEach, describe, expect, it, vi } from 'vitest'

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  isDatabaseConfigured: () => true,
  query: (...args: unknown[]) => queryMock(...args),
}))

import { GET } from './route'

const KNOWN_ID = '22222222-2222-4222-8222-222222222222'
const UNKNOWN_ID = '11111111-1111-4111-8111-111111111111'

function curatedRow(id: string) {
  return {
    id,
    yelp_id: null,
    source: 'manual',
    category: 'plumbing',
    cities: ['marietta'],
    name: 'Acme Plumbing',
    phone: '',
    address: '',
    image_url: '',
    website_url: null,
    review_url: null,
    rating: null,
    review_count: null,
    categories: [],
    trial_ends_at: '2099-01-01T00:00:00.000Z',
    is_trial: true,
    pro_site_enabled: true,
    is_draft: false,
    contact_email: null,
    dashboard_token: null,
  }
}

function makeRequest(id: string): Request {
  return new Request(`https://example.test/api/listing-status/${id}`, {
    headers: { 'x-forwarded-for': `10.7.0.${id.length}` },
  })
}

describe('GET /api/listing-status/[id]', () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      const text = String(sql)
      if (text.includes('curated_businesses') && text.includes('WHERE id = $1')) {
        return params[0] === KNOWN_ID ? [curatedRow(KNOWN_ID)] : []
      }
      return []
    })
  })

  it.each(['abc', 'not-a-uuid'])('returns 404 for non-UUID id %s without querying', async (id) => {
    const res = await GET(makeRequest(id) as never, { params: Promise.resolve({ id }) })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('returns 404 when a valid UUID matches no listing', async () => {
    const res = await GET(makeRequest(UNKNOWN_ID) as never, { params: Promise.resolve({ id: UNKNOWN_ID }) })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), [UNKNOWN_ID])
  })

  it('returns the listing status for a valid id that exists', async () => {
    const res = await GET(makeRequest(KNOWN_ID) as never, { params: Promise.resolve({ id: KNOWN_ID }) })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'trial', businessName: 'Acme Plumbing' })
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), [KNOWN_ID])
  })
})
