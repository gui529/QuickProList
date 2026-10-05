import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'

const { getMergedResults } = vi.hoisted(() => ({
  getMergedResults: vi.fn(),
}))
vi.mock('@/lib/search', () => ({ getMergedResults }))

import { GET } from './route'

let ipCounter = 0
function get(query: string): NextRequest {
  ipCounter += 1
  return new NextRequest(`https://example.test/api/search?${query}`, {
    headers: { 'x-forwarded-for': `10.0.0.${ipCounter}` },
  })
}

describe('GET /api/search open area', () => {
  beforeEach(() => {
    getMergedResults.mockReset().mockResolvedValue([])
  })

  it.each(['Acworth', 'Kennesaw', 'Marietta', 'Woodstock', 'Marietta, GA', 'Smyrna', 'Canton', 'Fair Oaks, GA'])(
    'accepts %s',
    async (location) => {
      const res = await GET(get(`category=plumbing&location=${encodeURIComponent(location)}`))

      expect(res.status).toBe(200)
      expect(getMergedResults).toHaveBeenCalledTimes(1)
    }
  )

  it.each(['Atlanta, GA', 'Marietta, OH'])('refuses %s without searching', async (location) => {
    const res = await GET(get(`category=plumbing&location=${encodeURIComponent(location)}`))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/not open there yet/i)
    expect(body.businesses).toBeUndefined()
    expect(getMergedResults).not.toHaveBeenCalled()
  })

  it('omits private fields from results', async () => {
    const secret = {
      id: 'biz-1',
      source: 'manual' as const,
      name: 'Acme Plumbing',
      rating: null,
      reviewCount: null,
      phone: '555-0100',
      address: '1 Main St',
      imageUrl: '',
      url: '',
      categories: ['Plumbing'],
      proSiteEnabled: true,
      contactEmail: 'owner@acme.example',
      dashboardToken: 'secret-dash-token',
    }
    getMergedResults.mockResolvedValue([secret])

    const merged = await GET(get('category=plumbing&location=Marietta'))
    const mergedBody = await merged.json()

    expect(merged.status).toBe(200)
    for (const body of [mergedBody]) {
      expect(body.businesses[0]).toMatchObject({ id: 'biz-1', name: 'Acme Plumbing' })
      expect(body.businesses[0]).not.toHaveProperty('dashboardToken')
      expect(body.businesses[0]).not.toHaveProperty('contactEmail')
      expect(JSON.stringify(body)).not.toContain('secret-dash-token')
      expect(JSON.stringify(body)).not.toContain('owner@acme.example')
    }
  })

  it('refuses coordinates outside the area', async () => {
    const coords = await GET(get('category=plumbing&lat=33.7&lng=-84.4'))

    expect(coords.status).toBe(400)
    expect(getMergedResults).not.toHaveBeenCalled()
  })

  it('returns a generic 502 without leaking the underlying error', async () => {
    getMergedResults.mockRejectedValue(new Error('supabase exploded: secret detail'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await GET(get('category=plumbing&location=Marietta'))
    const body = await res.json()

    expect(res.status).toBe(502)
    expect(body).toEqual({ error: 'Failed to fetch results' })
  })
})
