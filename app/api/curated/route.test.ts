import { NextRequest } from 'next/server'
import { describe, expect, it, beforeEach, vi } from 'vitest'

const { requireAdminMock, getCuratedMock, listAllCuratedMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getCuratedMock: vi.fn(),
  listAllCuratedMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  requireAdmin: requireAdminMock,
  AuthError: class AuthError extends Error {
    status: 401 | 403
    constructor(status: 401 | 403, message: string) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/kv', () => ({
  getCurated: getCuratedMock,
  listAllCurated: listAllCuratedMock,
  addCuratedFromYelp: vi.fn(),
  addCuratedManual: vi.fn(),
  removeCurated: vi.fn(),
  updateCuratedCities: vi.fn(),
  updateProSiteEnabled: vi.fn(),
  updateCuratedManual: vi.fn(),
}))

vi.mock('@/lib/yelp', () => ({ getBusinessById: vi.fn() }))

import { GET } from './route'
import { AuthError } from '@/lib/auth'

const secretBusiness = {
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
  cities: ['marietta'],
  category: 'plumbing',
  proSiteEnabled: true,
  contactEmail: 'owner@acme.example',
  dashboardToken: 'secret-dash-token',
  isTrial: true,
  trialEndsAt: '2099-01-01T00:00:00.000Z',
}

function get(query = ''): NextRequest {
  const qs = query ? `?${query}` : ''
  return new NextRequest(`https://example.test/api/curated${qs}`)
}

describe('GET /api/curated', () => {
  beforeEach(() => {
    requireAdminMock.mockReset()
    getCuratedMock.mockReset()
    listAllCuratedMock.mockReset()
  })

  it('returns a public shape for a category and city search', async () => {
    getCuratedMock.mockResolvedValue([secretBusiness])

    const res = await GET(get('category=plumbing&city=Marietta'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(requireAdminMock).not.toHaveBeenCalled()
    expect(body.businesses).toEqual([
      expect.objectContaining({ id: 'biz-1', name: 'Acme Plumbing', proSiteEnabled: true }),
    ])
    expect(JSON.stringify(body)).not.toContain('secret-dash-token')
    expect(JSON.stringify(body)).not.toContain('owner@acme.example')
    expect(body.businesses[0]).not.toHaveProperty('dashboardToken')
    expect(body.businesses[0]).not.toHaveProperty('contactEmail')
  })

  it('requires an admin to list every curated business', async () => {
    requireAdminMock.mockRejectedValue(new AuthError(401, 'Not signed in'))

    const res = await GET(get())

    expect(res.status).toBe(401)
    expect(listAllCuratedMock).not.toHaveBeenCalled()
  })

  it('returns full records, including private fields, to an admin', async () => {
    requireAdminMock.mockResolvedValue({ email: 'admin@example.com', userId: 'admin-1' })
    listAllCuratedMock.mockResolvedValue([secretBusiness])

    const res = await GET(get())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.businesses[0].dashboardToken).toBe('secret-dash-token')
    expect(body.businesses[0].contactEmail).toBe('owner@acme.example')
  })
})
