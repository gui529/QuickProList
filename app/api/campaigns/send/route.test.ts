import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sendSmsMock, sendEmailMock, recordMock } = vi.hoisted(() => ({
  sendSmsMock: vi.fn(),
  sendEmailMock: vi.fn(),
  recordMock: vi.fn(async (i: unknown) => ({ id: 'c1', ...(i as object) })),
}))

vi.mock('@/lib/auth', () => ({
  AuthError: class extends Error {},
  requireAdmin: vi.fn(async () => {}),
}))
vi.mock('@/lib/campaigns', () => ({ recordContact: recordMock, DEFAULT_MESSAGE: 'default' }))
vi.mock('@/lib/email', () => ({ sendEmail: sendEmailMock }))
const { createInvitationMock, isSuppressedMock } = vi.hoisted(() => ({
  createInvitationMock: vi.fn(async () => 'tok'),
  isSuppressedMock: vi.fn<(c: string, v: string) => Promise<boolean>>(async () => false),
}))
vi.mock('@/lib/invitations', () => ({ createInvitation: createInvitationMock }))
vi.mock('@/lib/suppressions', async (orig) => ({
  ...(await orig<typeof import('@/lib/suppressions')>()),
  isSuppressed: isSuppressedMock,
}))
vi.mock('@/lib/sms', async (orig) => ({
  ...(await orig<typeof import('@/lib/sms')>()),
  sendSms: sendSmsMock,
}))

import { NextRequest } from 'next/server'
import { POST } from './route'
import { SmsDisabledError } from '@/lib/sms'
import { SuppressedError } from '@/lib/suppressions'

const post = (body: object) =>
  new NextRequest('https://example.test/api/campaigns/send', {
    method: 'POST',
    body: JSON.stringify(body),
  })

describe('POST /api/campaigns/send opt-out handling', () => {
  beforeEach(() => {
    sendSmsMock.mockReset()
    sendEmailMock.mockReset()
    recordMock.mockClear()
    createInvitationMock.mockClear()
    isSuppressedMock.mockReset()
    isSuppressedMock.mockResolvedValue(false)
  })

  it('does not create an enrollment invitation for an already-opted-out email', async () => {
    isSuppressedMock.mockResolvedValue(true)
    const res = await POST(
      post({ channel: 'email', businessName: 'Biz', email: 'A@Example.com', category: 'plumbers', city: 'Acworth' })
    )
    expect(res.status).toBe(409)
    expect(isSuppressedMock).toHaveBeenCalledWith('email', 'a@example.com')
    expect(createInvitationMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('returns 409 and logs nothing when the email recipient opted out', async () => {
    sendEmailMock.mockRejectedValue(new SuppressedError('email', 'a@example.com'))
    const res = await POST(post({ channel: 'email', businessName: 'Biz', email: 'a@example.com' }))
    expect(res.status).toBe(409)
    expect(recordMock).not.toHaveBeenCalled()
  })

  it('returns 409 and logs nothing when the SMS recipient opted out', async () => {
    sendSmsMock.mockRejectedValue(new SuppressedError('sms', '+15551112222'))
    const res = await POST(post({ channel: 'sms', businessName: 'Biz', phone: '555-111-2222' }))
    expect(res.status).toBe(409)
    expect(recordMock).not.toHaveBeenCalled()
  })

  it('returns 403 when SMS outreach is switched off', async () => {
    sendSmsMock.mockRejectedValue(new SmsDisabledError())
    const res = await POST(post({ channel: 'sms', businessName: 'Biz', phone: '555-111-2222' }))
    expect(res.status).toBe(403)
    expect(recordMock).not.toHaveBeenCalled()
  })

  it('still records a normal successful send', async () => {
    sendEmailMock.mockResolvedValue('email_1')
    const res = await POST(post({ channel: 'email', businessName: 'Biz', email: 'a@example.com' }))
    expect(res.status).toBe(200)
    expect(recordMock).toHaveBeenCalledTimes(1)
  })
})
