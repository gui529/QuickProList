import { describe, expect, it, beforeEach, vi } from 'vitest'

const { getCuratedByIdMock, incrementContactClickMock } = vi.hoisted(() => ({
  getCuratedByIdMock: vi.fn(),
  incrementContactClickMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/kv', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kv')>('@/lib/kv')
  return {
    ...actual,
    getCuratedById: getCuratedByIdMock,
    incrementContactClick: incrementContactClickMock,
  }
})

import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('https://example.test/api/pro/biz-1/click', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('POST /api/pro/[id]/click', () => {
  beforeEach(() => {
    getCuratedByIdMock.mockReset()
    incrementContactClickMock.mockClear()
  })

  it('returns 200 and increments the counter for a valid type', async () => {
    getCuratedByIdMock.mockResolvedValue({ id: 'biz-1', name: 'Acme Plumbing' })

    const res = await POST(makeRequest({ type: 'phone' }) as never, makeParams('biz-1'))

    expect(res.status).toBe(200)
    expect(incrementContactClickMock).toHaveBeenCalledWith('biz-1', 'phone')
  })

  it('returns 400 for an invalid type without incrementing', async () => {
    getCuratedByIdMock.mockResolvedValue({ id: 'biz-1', name: 'Acme Plumbing' })

    const res = await POST(makeRequest({ type: 'bogus' }) as never, makeParams('biz-1'))

    expect(res.status).toBe(400)
    expect(incrementContactClickMock).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown business id without incrementing', async () => {
    getCuratedByIdMock.mockResolvedValue(null)

    const res = await POST(makeRequest({ type: 'website' }) as never, makeParams('unknown'))

    expect(res.status).toBe(404)
    expect(incrementContactClickMock).not.toHaveBeenCalled()
  })
})
