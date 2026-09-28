import { beforeEach, describe, expect, it, vi } from 'vitest'

const { addMock, verifyMock } = vi.hoisted(() => ({
  addMock: vi.fn(async () => {}),
  verifyMock: vi.fn(),
}))
vi.mock('resend', () => ({ Resend: class { webhooks = { verify: verifyMock } } }))
vi.mock('@/lib/suppressions', async (orig) => ({
  ...(await orig<typeof import('@/lib/suppressions')>()),
  addSuppression: addMock,
}))

import { NextRequest } from 'next/server'
import { POST } from './route'

const req = () =>
  new NextRequest('https://example.test/api/resend/webhook', { method: 'POST', body: '{}' })

describe('POST /api/resend/webhook', () => {
  beforeEach(() => {
    addMock.mockClear()
    verifyMock.mockReset()
    process.env.RESEND_WEBHOOK_SECRET = 'whsec'
    process.env.RESEND_API_KEY = 'key'
  })

  it('rejects a payload that fails signature verification', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('bad sig')
    })
    expect((await POST(req())).status).toBe(401)
    expect(addMock).not.toHaveBeenCalled()
  })

  it('suppresses complaint recipients', async () => {
    verifyMock.mockReturnValue({ type: 'email.complained', data: { to: ['A@Example.com'] } })
    expect((await POST(req())).status).toBe(200)
    expect(addMock).toHaveBeenCalledWith('email', 'a@example.com', 'complaint')
  })

  it('suppresses permanent bounces but not transient ones', async () => {
    verifyMock.mockReturnValue({
      type: 'email.bounced',
      data: { to: ['a@example.com'], bounce: { type: 'Permanent' } },
    })
    await POST(req())
    expect(addMock).toHaveBeenCalledWith('email', 'a@example.com', 'bounce')

    addMock.mockClear()
    verifyMock.mockReturnValue({
      type: 'email.bounced',
      data: { to: ['a@example.com'], bounce: { type: 'Transient' } },
    })
    await POST(req())
    expect(addMock).not.toHaveBeenCalled()
  })
})
