import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'

const { getMergedResults, searchBusinesses } = vi.hoisted(() => ({
  getMergedResults: vi.fn(),
  searchBusinesses: vi.fn(),
}))
vi.mock('@/lib/search', () => ({ getMergedResults }))
vi.mock('@/lib/yelp', () => ({ searchBusinesses }))

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
    searchBusinesses.mockReset().mockResolvedValue([])
  })

  it.each(['Acworth', 'Kennesaw', 'Marietta', 'Woodstock', 'Marietta, GA'])('accepts %s', async (location) => {
    const res = await GET(get(`category=plumbing&location=${encodeURIComponent(location)}`))

    expect(res.status).toBe(200)
    expect(getMergedResults).toHaveBeenCalledTimes(1)
  })

  it.each(['Smyrna, GA', 'Atlanta, GA', 'Canton'])('refuses %s without searching', async (location) => {
    const res = await GET(get(`category=plumbing&location=${encodeURIComponent(location)}`))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/not open there yet/i)
    expect(body.businesses).toBeUndefined()
    expect(getMergedResults).not.toHaveBeenCalled()
    expect(searchBusinesses).not.toHaveBeenCalled()
  })

  it('omits private fields from merged and raw results', async () => {
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
    searchBusinesses.mockResolvedValue([secret])

    const merged = await GET(get('category=plumbing&location=Marietta'))
    const raw = await GET(get('raw=1&category=plumbing&location=Marietta'))
    const mergedBody = await merged.json()
    const rawBody = await raw.json()

    expect(merged.status).toBe(200)
    expect(raw.status).toBe(200)
    for (const body of [mergedBody, rawBody]) {
      expect(body.businesses[0]).toMatchObject({ id: 'biz-1', name: 'Acme Plumbing' })
      expect(body.businesses[0]).not.toHaveProperty('dashboardToken')
      expect(body.businesses[0]).not.toHaveProperty('contactEmail')
      expect(JSON.stringify(body)).not.toContain('secret-dash-token')
      expect(JSON.stringify(body)).not.toContain('owner@acme.example')
    }
  })

  it('refuses raw Yelp searches and coordinates outside the area', async () => {
    const raw = await GET(get('raw=1&category=plumbing&location=Atlanta'))
    const coords = await GET(get('category=plumbing&lat=33.7&lng=-84.4'))

    expect(raw.status).toBe(400)
    expect(coords.status).toBe(400)
    expect(searchBusinesses).not.toHaveBeenCalled()
    expect(getMergedResults).not.toHaveBeenCalled()
  })
})
