import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContactClickType } from './kv'

const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn().mockResolvedValue('email_123'),
}))

vi.mock('./email', () => ({ sendEmail: sendEmailMock }))

import { sendLeadAlertEmail } from './lead-alerts'

const CLICK_TYPES: ContactClickType[] = ['phone', 'website', 'directions']

describe('sendLeadAlertEmail', () => {
  beforeEach(() => {
    sendEmailMock.mockClear()
  })

  it.each(CLICK_TYPES)(
    'sends exactly one email naming the %s click and the business',
    async (clickType) => {
      await sendLeadAlertEmail(
        { name: 'Acme Plumbing', contactEmail: 'owner@acme.example' },
        clickType
      )

      expect(sendEmailMock).toHaveBeenCalledTimes(1)
      const [to, businessName, body] = sendEmailMock.mock.calls[0]
      expect(to).toBe('owner@acme.example')
      expect(businessName).toBe('Acme Plumbing')
      const content = `${businessName}\n${String(body)}`
      expect(content).toContain(clickType)
      expect(content).toContain('Acme Plumbing')
    }
  )

  it('does not send when contact_email is null', async () => {
    await sendLeadAlertEmail({ name: 'Acme Plumbing', contactEmail: null }, 'phone')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('does not send when contact_email is missing or empty', async () => {
    await sendLeadAlertEmail({ name: 'Acme Plumbing' }, 'website')
    await sendLeadAlertEmail({ name: 'Acme Plumbing', contactEmail: '' }, 'directions')
    await sendLeadAlertEmail({ name: 'Acme Plumbing', contactEmail: '   ' }, 'phone')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
