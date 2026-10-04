import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContactClickType } from './kv'

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(async () => ({ data: { id: 'email_123' }, error: null })),
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

import { sendLeadAlertEmail } from './lead-alerts'

const CLICK_TYPES: ContactClickType[] = ['phone', 'website', 'directions']

const PITCH_MARKERS = ['$29.99', 'Claim Your Spot', 'Pricing card']

describe('sendLeadAlertEmail', () => {
  beforeEach(() => {
    sendMock.mockClear()
    process.env.RESEND_API_KEY = 'test_key'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'
  })

  it.each(CLICK_TYPES)(
    'renders a %s lead notice that names the business and is not the listing pitch',
    async (clickType) => {
      await sendLeadAlertEmail(
        { name: 'Acme Plumbing', contactEmail: 'owner@acme.example' },
        clickType
      )

      expect(sendMock).toHaveBeenCalledTimes(1)
      const message = sendMock.mock.calls[0][0] as {
        to: string
        subject: string
        html: string
        text: string
      }
      expect(message.to).toBe('owner@acme.example')

      expect(message.subject).toContain(clickType)
      expect(message.subject).toContain('Acme Plumbing')
      expect(message.html).toContain(clickType)
      expect(message.html).toContain('Acme Plumbing')
      expect(message.text).toContain(clickType)
      expect(message.text).toContain('Acme Plumbing')

      const rendered = `${message.subject}\n${message.html}\n${message.text}`
      for (const marker of PITCH_MARKERS) {
        expect(rendered).not.toContain(marker)
      }
    }
  )

  it('does not send when contact_email is null', async () => {
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM_EMAIL
    await sendLeadAlertEmail({ name: 'Acme Plumbing', contactEmail: null }, 'phone')
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('does not send when contact_email is missing or empty', async () => {
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM_EMAIL
    await sendLeadAlertEmail({ name: 'Acme Plumbing' }, 'website')
    await sendLeadAlertEmail({ name: 'Acme Plumbing', contactEmail: '' }, 'directions')
    await sendLeadAlertEmail({ name: 'Acme Plumbing', contactEmail: '   ' }, 'phone')
    expect(sendMock).not.toHaveBeenCalled()
  })
})
