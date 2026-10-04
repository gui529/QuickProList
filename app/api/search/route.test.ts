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

  it.each(['Acworth', 'Kennesaw', 'Marietta', 'Woodstock', 'Marietta, GA'])('accepts %s', async (location) => {
    const res = await GET(get(`category=plumbing&location=${encodeURIComponent(location)}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.businesses).toEqual([])
    expect(getMergedResults).toHaveBeenCalledTimes(1)
  })

  it.each(['Smyrna, GA', 'Atlanta, GA', 'Canton', 'Austin, TX'])('refuses %s without searching', async (location) => {
    const res = await GET(get(`category=plumbing&location=${encodeURIComponent(location)}`))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/not open there yet/i)
    expect(body.businesses).toBeUndefined()
    expect(getMergedResults).not.toHaveBeenCalled()
  })

  it('refuses raw searches and coordinates', async () => {
    const rawClosed = await GET(get('raw=1&category=plumbing&location=Atlanta'))
    const rawOpen = await GET(get('raw=1&category=plumbing&location=Kennesaw'))
    const coords = await GET(get('category=plumbing&lat=33.7&lng=-84.4'))

    expect(rawClosed.status).toBe(400)
    expect(rawOpen.status).toBe(400)
    expect(coords.status).toBe(400)
    expect(getMergedResults).not.toHaveBeenCalled()
    const rawBody = await rawOpen.json()
    expect(rawBody.error).not.toMatch(/yelp/i)
  })

  it('returns an empty list instead of failing when curated lookup throws', async () => {
    getMergedResults.mockRejectedValue(new Error('supabase down'))

    const res = await GET(get('category=plumbing&location=Marietta'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.businesses).toEqual([])
    expect(body.error).toBeUndefined()
  })
})
