import { beforeEach, describe, expect, it, vi } from 'vitest'

const addSuppressionMock = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/suppressions', async (orig) => ({
  ...(await orig<typeof import('@/lib/suppressions')>()),
  addSuppression: addSuppressionMock,
}))

import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { createUnsubscribeToken } from '@/lib/unsubscribe'

const req = (method: string, token: string) =>
  new NextRequest(`https://example.test/api/unsubscribe?token=${encodeURIComponent(token)}`, {
    method,
  })

describe('/api/unsubscribe', () => {
  beforeEach(() => {
    addSuppressionMock.mockClear()
    process.env.UNSUBSCRIBE_SECRET = 'test-secret'
  })

  it('GET shows a confirm page and does NOT unsubscribe', async () => {
    const res = await GET(req('GET', createUnsubscribeToken('a@example.com')))
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('a@example.com')
    expect(addSuppressionMock).not.toHaveBeenCalled()
  })

  it('POST suppresses the token\'s email', async () => {
    const res = await POST(req('POST', createUnsubscribeToken('A@Example.com')))
    expect(res.status).toBe(200)
    expect(addSuppressionMock).toHaveBeenCalledWith('email', 'a@example.com', 'unsubscribe')
  })

  it('rejects forged tokens on both methods', async () => {
    expect((await GET(req('GET', 'x.y'))).status).toBe(400)
    expect((await POST(req('POST', 'x.y'))).status).toBe(400)
    expect(addSuppressionMock).not.toHaveBeenCalled()
  })
})
