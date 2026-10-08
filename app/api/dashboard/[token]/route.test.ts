import { describe, expect, it, beforeEach, vi } from 'vitest'

const { updateCuratedByDashboardTokenMock } = vi.hoisted(() => ({
  updateCuratedByDashboardTokenMock: vi.fn(),
}))

vi.mock('@/lib/kv', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kv')>('@/lib/kv')
  return {
    ...actual,
    updateCuratedByDashboardToken: updateCuratedByDashboardTokenMock,
  }
})

import { PATCH } from './route'

function makeRequest(body: unknown): Request {
  return new Request('https://example.test/api/dashboard/good-token', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams(token: string) {
  return { params: Promise.resolve({ token }) }
}

describe('PATCH /api/dashboard/[token]', () => {
  beforeEach(() => {
    process.env.PRO_DASHBOARD_ENABLED = 'true'
    updateCuratedByDashboardTokenMock.mockReset()
  })

  it('returns 404 when the pro dashboard feature flag is off', async () => {
    delete process.env.PRO_DASHBOARD_ENABLED
    const res = await PATCH(makeRequest({ websiteUrl: 'https://example.com' }) as never, makeParams('good-token') as never)
    expect(res.status).toBe(404)
    expect(updateCuratedByDashboardTokenMock).not.toHaveBeenCalled()
  })

  it('updates only the allow-listed fields for a valid token', async () => {
    updateCuratedByDashboardTokenMock.mockResolvedValue(true)

    const res = await PATCH(
      makeRequest({
        websiteUrl: 'https://example.com',
        contactEmail: 'owner@example.com',
        reviewUrl: 'https://g.page/r/example/review',
        name: 'Should be ignored',
        category: 'should-be-ignored',
      }) as never,
      makeParams('good-token')
    )

    expect(res.status).toBe(200)
    expect(updateCuratedByDashboardTokenMock).toHaveBeenCalledWith('good-token', {
      websiteUrl: 'https://example.com',
      contactEmail: 'owner@example.com',
      reviewUrl: 'https://g.page/r/example/review',
    })
  })

  it('returns 404 and mutates nothing for an unknown token', async () => {
    updateCuratedByDashboardTokenMock.mockResolvedValue(false)

    const res = await PATCH(
      makeRequest({ websiteUrl: 'https://example.com' }) as never,
      makeParams('bogus-token')
    )

    expect(res.status).toBe(404)
  })

  it('returns 400 when no allow-listed field is present', async () => {
    const res = await PATCH(
      makeRequest({ name: 'Should be ignored' }) as never,
      makeParams('good-token')
    )

    expect(res.status).toBe(400)
    expect(updateCuratedByDashboardTokenMock).not.toHaveBeenCalled()
  })

  it('returns a generic message when the database update fails', async () => {
    const dbError = {
      message: "Could not find the 'review_url' column of 'curated_businesses' in the schema cache",
      code: 'PGRST204',
    }
    updateCuratedByDashboardTokenMock.mockRejectedValue(dbError)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await PATCH(
      makeRequest({ reviewUrl: 'https://g.page/r/example/review' }) as never,
      makeParams('any-token')
    )
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toEqual({ error: 'Failed to update' })
    expect(errorSpy).toHaveBeenCalledWith('request failed:', dbError)
    errorSpy.mockRestore()
  })

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('https://example.test/api/dashboard/good-token', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    })

    const res = await PATCH(req as never, makeParams('good-token'))

    expect(res.status).toBe(400)
    expect(updateCuratedByDashboardTokenMock).not.toHaveBeenCalled()
  })
})
