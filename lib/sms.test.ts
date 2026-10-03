import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createMock, isSuppressedMock } = vi.hoisted(() => ({
  createMock: vi.fn(async () => ({ sid: 'SM1' })),
  isSuppressedMock: vi.fn(async () => false),
}))

vi.mock('twilio', () => ({ default: () => ({ messages: { create: createMock } }) }))
vi.mock('./suppressions', async (orig) => ({
  ...(await orig<typeof import('./suppressions')>()),
  isSuppressed: isSuppressedMock,
}))

import { SmsDisabledError, sendSms, withOptOutLanguage } from './sms'
import { SuppressedError } from './suppressions'

describe('sendSms', () => {
  beforeEach(() => {
    createMock.mockClear()
    isSuppressedMock.mockReset()
    isSuppressedMock.mockResolvedValue(false)
    process.env.SMS_OUTREACH_ENABLED = 'true'
    process.env.TWILIO_ACCOUNT_SID = 'AC1'
    process.env.TWILIO_AUTH_TOKEN = 'tok'
    process.env.TWILIO_FROM_NUMBER = '+15550000000'
  })

  it('is off unless SMS_OUTREACH_ENABLED is exactly "true"', async () => {
    delete process.env.SMS_OUTREACH_ENABLED
    await expect(sendSms('+15551112222', 'hi')).rejects.toBeInstanceOf(SmsDisabledError)
    process.env.SMS_OUTREACH_ENABLED = '1'
    await expect(sendSms('+15551112222', 'hi')).rejects.toBeInstanceOf(SmsDisabledError)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('refuses suppressed numbers', async () => {
    isSuppressedMock.mockResolvedValue(true)
    await expect(sendSms('+15551112222', 'hi')).rejects.toBeInstanceOf(SuppressedError)
    expect(isSuppressedMock).toHaveBeenCalledWith('sms', '+15551112222')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('appends opt-out language when the body lacks it, and only then', async () => {
    await sendSms('+15551112222', 'Feature your business?')
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Feature your business? Reply STOP to opt out.' })
    )
    expect(withOptOutLanguage('Hi. Reply STOP to opt out.')).toBe('Hi. Reply STOP to opt out.')
  })
})
