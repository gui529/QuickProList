import { describe, expect, it, beforeEach, vi } from 'vitest'

const { sendWinbackEmailsMock } = vi.hoisted(() => ({
  sendWinbackEmailsMock: vi.fn(),
}))

vi.mock('@/lib/winback', () => ({ sendWinbackEmails: sendWinbackEmailsMock }))

import { GET } from './route'

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://example.test/api/cron/winback', { headers })
}

describe('GET /api/cron/winback', () => {
  beforeEach(() => {
    sendWinbackEmailsMock.mockReset()
    process.env.CRON_SECRET = 'test-secret'
  })

  it('rejects a request with no Authorization header', async () => {
    const res = await GET(makeRequest() as never)

    expect(res.status).toBe(401)
    expect(sendWinbackEmailsMock).not.toHaveBeenCalled()
  })

  it('rejects a request with the wrong secret', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer wrong-secret' }) as never)

    expect(res.status).toBe(401)
    expect(sendWinbackEmailsMock).not.toHaveBeenCalled()
  })

  it('rejects every request when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }) as never)

    expect(res.status).toBe(401)
    expect(sendWinbackEmailsMock).not.toHaveBeenCalled()
  })

  it('sends win-back emails and returns the count with the correct secret', async () => {
    sendWinbackEmailsMock.mockResolvedValue([
      { businessId: 'biz-1', contactEmail: 'a@example.com', emailId: 'email_1' },
    ])

    const res = await GET(makeRequest({ authorization: 'Bearer test-secret' }) as never)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ sent: 1 })
    expect(sendWinbackEmailsMock).toHaveBeenCalledTimes(1)
  })
})
