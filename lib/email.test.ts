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

import {
  buildMarketingCtaLabel,
  buildMarketingEmailSubject,
  formatFromAddress,
  formatMarketingFromAddress,
  sendEmail,
  sendDigestEmail,
} from './email'
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

describe('formatMarketingFromAddress', () => {
  it('uses CAMPAIGN_SENDER_NAME for bare addresses', () => {
    process.env.CAMPAIGN_SENDER_NAME = 'Jeremy'
    expect(formatMarketingFromAddress('hello@quickprolist.com')).toBe('Jeremy <hello@quickprolist.com>')
    delete process.env.CAMPAIGN_SENDER_NAME
  })
})

describe('buildMarketingEmailSubject', () => {
  it('uses a curiosity-style subject with city', () => {
    expect(buildMarketingEmailSubject('Biz', { city: 'marietta', category: 'homecleaning' })).toBe(
      'Okay to add Biz to our Marietta list?'
    )
  })
})

describe('buildMarketingCtaLabel', () => {
  it('prefers preview wording when enroll URL exists', () => {
    expect(buildMarketingCtaLabel({ enrollUrl: 'https://example.test/enroll/x' })).toBe(
      'Preview what we would publish'
    )
  })

  it('describes local search when city and category set', () => {
    expect(buildMarketingCtaLabel({ city: 'marietta', category: 'plumbing' })).toBe(
      'See Plumbers around Marietta'
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

  it('sends person-like plain marketing mail without a branded template', async () => {
    process.env.CAMPAIGN_SENDER_NAME = 'Jeremy'
    await sendEmail('owner@example.com', 'Acme Plumbing', 'Quick note about your area.', {
      city: 'marietta',
      category: 'plumbing',
      enrollUrl: 'https://example.test/enroll/abc',
    })

    const call = sendMock.mock.calls[0][0]
    expect(call.from).toBe('Jeremy <noreply@example.com>')
    expect(call.subject).toBe('Okay to add Acme Plumbing to our Marietta list?')
    expect(call.html).not.toContain('linear-gradient')
    expect(call.html).not.toContain('border-radius:50px')
    expect(call.text).toMatch(/^Hi,\n/)
    expect(call.text).not.toContain('Hi Acme Plumbing,')
    expect(call.text).toContain('Preview what we would publish')
    expect(call.text).toContain('https://example.test/enroll/abc')
    expect(call.text).toContain('We are going to launch soon')
    expect(call.text).not.toContain('cancel anytime')
    expect(call.subject).not.toMatch(/🏠|\$29/)
    delete process.env.CAMPAIGN_SENDER_NAME
  })

  it('uses a transactional subject for payment notices', async () => {
    await sendEmail('owner@example.com', 'Acme', "We weren't able to process your payment.", {
      kind: 'transactional',
    })
    expect(sendMock.mock.calls[0][0].subject).toBe('QuickProList payment issue — action needed')
  })

  it('escapes HTML-unsafe characters in marketing HTML', async () => {
    await sendEmail(
      'owner@example.com',
      '<script>alert(1)</script>',
      'Hello <b>there</b>\nSecond line & "quoted" more'
    )

    expect(sendMock).toHaveBeenCalledTimes(1)
    const call = sendMock.mock.calls[0][0]

    expect(call.subject).toContain('<script>alert(1)</script>')
    expect(call.html).not.toContain('<script>alert(1)</script>')
    expect(call.html).toContain('Hello &lt;b&gt;there&lt;/b&gt;')
    expect(call.html).toContain('Second line &amp; &quot;quoted&quot; more')
    expect(call.text).toContain('Hello <b>there</b>')
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
