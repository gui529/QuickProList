import { beforeEach, describe, expect, it, vi } from 'vitest'
import twilio from 'twilio'

const { addMock, removeMock } = vi.hoisted(() => ({
  addMock: vi.fn(async () => {}),
  removeMock: vi.fn(async () => {}),
}))
vi.mock('@/lib/suppressions', () => ({ addSuppression: addMock, removeSuppression: removeMock }))

import { NextRequest } from 'next/server'
import { POST } from './route'

const TOKEN = 'twilio-token'
const URL_ = 'https://example.test/api/sms/inbound'

function inbound(params: Record<string, string>, signed = true) {
  const sig = signed ? twilio.getExpectedTwilioSignature(TOKEN, URL_, params) : 'bad'
  return new NextRequest(URL_, {
    method: 'POST',
    headers: { 'x-twilio-signature': sig, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
}

describe('POST /api/sms/inbound', () => {
  beforeEach(() => {
    addMock.mockClear()
    removeMock.mockClear()
    process.env.TWILIO_AUTH_TOKEN = TOKEN
    process.env.SITE_URL = 'https://example.test'
  })

  it.each(['STOP', 'stop', ' Unsubscribe ', 'QUIT', 'CANCEL', 'END', 'STOPALL'])(
    'suppresses the sender on %j',
    async (body) => {
      const res = await POST(inbound({ From: '+15551112222', Body: body }))
      expect(res.status).toBe(200)
      expect(addMock).toHaveBeenCalledWith('sms', '+15551112222', expect.stringMatching(/^sms-/))
    }
  )

  it('lifts the suppression on START / UNSTOP only', async () => {
    await POST(inbound({ From: '+15551112222', Body: 'START' }))
    expect(removeMock).toHaveBeenCalledWith('sms', '+15551112222')
    removeMock.mockClear()
    await POST(inbound({ From: '+15551112222', Body: 'yes please' }))
    expect(removeMock).not.toHaveBeenCalled()
    expect(addMock).not.toHaveBeenCalled()
  })

  it('does not treat a longer sentence containing "stop" as an opt-out keyword', async () => {
    await POST(inbound({ From: '+15551112222', Body: 'please stop by tomorrow' }))
    expect(addMock).not.toHaveBeenCalled()
  })

  it('rejects requests with a bad or missing signature', async () => {
    expect((await POST(inbound({ From: '+15551112222', Body: 'STOP' }, false))).status).toBe(401)
    const noSig = new NextRequest(URL_, { method: 'POST', body: 'From=%2B1&Body=STOP' })
    expect((await POST(noSig)).status).toBe(401)
    expect(addMock).not.toHaveBeenCalled()
  })
})
