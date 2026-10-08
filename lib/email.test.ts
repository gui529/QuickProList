import { describe, expect, it, vi, beforeEach } from 'vitest'

const sendMock = vi.fn(async () => ({ data: { id: 'email_123' }, error: null }))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

const isSuppressedMock = vi.hoisted(() => vi.fn(async () => false))

vi.mock('./suppressions', async (orig) => ({
  ...(await orig<typeof import('./suppressions')>()),
  isSuppressed: isSuppressedMock,
}))

import { buildMarketingEmailSubject, formatFromAddress, sendEmail, sendDigestEmail } from './email'
import { SuppressedError } from './suppressions'
import { verifyUnsubscribeToken } from './unsubscribe'

describe('formatFromAddress', () => {
  it('wraps bare addresses', () => {
    expect(formatFromAddress('hello@contact.example.com')).toBe('QuickProList <hello@contact.example.com>')
  })
  it('leaves preformatted values alone', () => {
    expect(formatFromAddress('Team <team@example.com>')).toBe('Team <team@example.com>')
  })
})

describe('buildMarketingEmailSubject', () => {
  it('includes city and category labels', () => {
    expect(buildMarketingEmailSubject('Biz', { city: 'marietta', category: 'homecleaning' })).toBe(
      'Biz — Cleaners in Marietta'
    )
  })
})

describe('sendEmail (lib/email.ts)', () => {
  beforeEach(() => {
    sendMock.mockClear()
    process.env.RESEND_API_KEY = 'test_key'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'
    process.env.UNSUBSCRIBE_SECRET = 'test-unsub-secret'
    process.env.SITE_URL = 'https://example.test'
    isSuppressedMock.mockReset()
    isSuppressedMock.mockResolvedValue(false)
  })

  it('formats From with a display name and uses a plain marketing subject', async () => {
    await sendEmail('owner@example.com', 'Acme Plumbing', 'Hello', {
      city: 'marietta',
      category: 'plumbing',
    })

    const call = sendMock.mock.calls[0][0]
    expect(call.from).toBe('QuickProList <noreply@example.com>')
    expect(call.subject).toBe('Acme Plumbing — Plumbers in Marietta')
    expect(call.subject).not.toMatch(/🏠|\$29/)
  })

  it('uses a transactional subject for payment notices', async () => {
    await sendEmail('owner@example.com', 'Acme', "We weren't able to process your payment.", {
      kind: 'transactional',
    })
    expect(sendMock.mock.calls[0][0].subject).toBe('QuickProList payment issue — action needed')
  })

  it('escapes HTML-unsafe characters in businessName and body lines before interpolating into the HTML email', async () => {
    await sendEmail(
      'owner@example.com',
      '<script>alert(1)</script>',
      'Hello <b>there</b>\nSecond line & "quoted" more'
    )

    expect(sendMock).toHaveBeenCalledTimes(1)
    const call = sendMock.mock.calls[0][0]

    expect(call.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(call.html).not.toContain('<script>alert(1)</script>')
    expect(call.html).toContain('Hello &lt;b&gt;there&lt;/b&gt;')
    expect(call.html).toContain('Second line &amp; &quot;quoted&quot; more')
  })

  it('leaves the plaintext fallback unescaped', async () => {
    const businessName = '<script>alert(1)</script>'
    const body = 'Hello <b>there</b>\nSecond line & "quoted" more'

    await sendEmail('owner@example.com', businessName, body)

    const call = sendMock.mock.calls[0][0]
    expect(call.text).toContain(body)
  })

  describe('marketing compliance', () => {
    it('adds a working one-click unsubscribe link and headers without a postal address', async () => {
      await sendEmail('Owner@Example.com', 'Biz', 'Hello')

      const call = sendMock.mock.calls[0][0] as {
        html: string
        text: string
        headers: Record<string, string>
      }
      const listUnsub = call.headers['List-Unsubscribe']
      const url = listUnsub.slice(1, -1)
      expect(call.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
      expect(url.startsWith('https://example.test/api/unsubscribe?token=')).toBe(true)
      expect(verifyUnsubscribeToken(decodeURIComponent(url.split('token=')[1]))).toBe(
        'owner@example.com'
      )
      expect(call.html).toContain('Unsubscribe')
      expect(call.html).not.toMatch(/Main St|woodhouse/i)
      expect(call.text).toContain(url)
      expect(call.text).not.toMatch(/Main St|woodhouse/i)
    })

    it('refuses to send to a suppressed address (case-insensitive)', async () => {
      isSuppressedMock.mockResolvedValue(true)

      await expect(sendEmail('Owner@Example.com', 'Biz', 'Hello')).rejects.toBeInstanceOf(
        SuppressedError
      )
      expect(isSuppressedMock).toHaveBeenCalledWith('email', 'owner@example.com')
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('refuses to send marketing email when unsubscribe signing is not configured', async () => {
      delete process.env.UNSUBSCRIBE_SECRET

      await expect(sendEmail('owner@example.com', 'Biz', 'Hello')).rejects.toThrow(/UNSUBSCRIBE_SECRET/)
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('does not suppress or require unsubscribe config for transactional email', async () => {
      isSuppressedMock.mockResolvedValue(true)
      delete process.env.UNSUBSCRIBE_SECRET

      await sendEmail('owner@example.com', 'Biz', 'Payment failed', { kind: 'transactional' })

      expect(isSuppressedMock).not.toHaveBeenCalled()
      expect(sendMock).toHaveBeenCalledTimes(1)
      const call = sendMock.mock.calls[0][0] as { headers?: unknown }
      expect(call.headers).toBeUndefined()
    })

    it('applies the same suppression and footer to the performance digest', async () => {
      const stats = {
        searchImpressions: 1,
        profileViews: 2,
        phoneClicks: 3,
        websiteClicks: 4,
        directionsClicks: 5,
      }

      await sendDigestEmail('owner@example.com', 'Biz', stats)
      const call = sendMock.mock.calls[0][0] as { headers: Record<string, string>; html: string }
      expect(call.headers['List-Unsubscribe']).toBeDefined()
      expect(call.html).toContain('Unsubscribe')

      sendMock.mockClear()
      isSuppressedMock.mockResolvedValue(true)
      await expect(sendDigestEmail('owner@example.com', 'Biz', stats)).rejects.toBeInstanceOf(
        SuppressedError
      )
      expect(sendMock).not.toHaveBeenCalled()
    })
  })
})
