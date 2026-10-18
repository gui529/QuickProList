import { describe, expect, it, vi, beforeEach } from 'vitest'

const sendMock = vi.fn<
  (message: {
    from: string
    to?: string | string[]
    subject: string
    html: string
    text: string
    headers?: Record<string, string>
    bcc?: string[]
  }) => Promise<{ data: { id: string }; error: null }>
>(async () => ({ data: { id: 'email_123' }, error: null }))

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
  COMMERCIAL_AD_DISCLOSURE,
  formatFromAddress,
  formatMarketingFromAddress,
  sendCommercialNotice,
  sendEmail,
  sendDigestEmail,
} from './email'
import { SuppressedError } from './suppressions'
import { verifyUnsubscribeToken } from './unsubscribe'
import { subscriptionConfirmationBody, subscriptionRenewalBody } from './subscription-terms'

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

  it('uses listed-pro subject for wave listed', () => {
    expect(
      buildMarketingEmailSubject('TE Certified', {
        city: 'marietta',
        category: 'electricians',
        campaignWave: 'listed',
      })
    ).toBe('TE Certified is on our Marietta list — 30-day preview?')
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
    delete process.env.CAMPAIGN_POSTAL_ADDRESS
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
    expect(call.text).toContain('$29.99/month')
    expect(call.text.indexOf('$29.99/month')).toBeGreaterThan(call.text.indexOf('https://example.test/enroll/abc'))
    expect(call.text).not.toContain('We are going to launch soon')
    expect(call.text).not.toContain('one-time')
    expect(call.text).not.toContain('cancel anytime')
    expect(call.subject).not.toMatch(/🏠|\$29/)
    expect(call.bcc).toEqual(['gui.quickprolist@gmail.com'])
    delete process.env.CAMPAIGN_SENDER_NAME
  })

  it('omits the price and does not invent a launch line when there is no enroll link', async () => {
    await sendEmail('owner@example.com', 'Acme Plumbing', 'Quick note.', {
      city: 'marietta',
      category: 'plumbing',
    })
    const call = sendMock.mock.calls[0][0]
    expect(call.text).not.toContain('$29.99')
    expect(call.text).not.toContain('We are going to launch soon')
    expect(call.text).not.toContain('one-time')
    expect(call.text).toContain('one short follow-up')
  })

  it('describes a follow-up as a follow-up', async () => {
    await sendEmail('owner@example.com', 'Acme', 'Checking back.', {
      campaignWave: 'follow-up',
      enrollUrl: 'https://example.test/enroll/abc',
    })
    const call = sendMock.mock.calls[0][0]
    expect(call.text).toContain('You received this follow-up')
    expect(call.text).not.toContain('one-time')
    expect(call.text).not.toContain('one short follow-up')
  })

  it('uses a transactional subject for payment notices', async () => {
    await sendEmail('owner@example.com', 'Acme', "We weren't able to process your payment.", {
      kind: 'transactional',
    })
    const txCall = sendMock.mock.calls[0][0]
    expect(txCall.subject).toBe('QuickProList payment issue — action needed')
    expect(txCall.bcc).toBeUndefined()
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
    it('adds a working one-click unsubscribe link and does not invent a postal address', async () => {
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

    it('sends a commercial notice with an accurate From, the given subject, and the full footer', async () => {
      process.env.CAMPAIGN_POSTAL_ADDRESS = '1 Market St, Atlanta, GA 30303'
      const body = [
        'Your QuickProList preview for Biz ends on November 17, 2026.',
        'If you do nothing, it comes down on November 17, 2026. Nothing is charged.',
        'https://example.test/enroll/tok?subscribe=1',
      ].join('\n')

      await sendCommercialNotice('Owner@Example.com', 'Your QuickProList preview ends November 17, 2026', body)

      const call = sendMock.mock.calls[0][0] as {
        from: string
        subject: string
        html: string
        text: string
        headers: Record<string, string>
        bcc?: string[]
      }
      expect(call.from).toBe('QuickProList <noreply@example.com>')
      expect(call.subject).toBe('Your QuickProList preview ends November 17, 2026')
      expect(call.text.startsWith('Your QuickProList preview for Biz ends on November 17, 2026.')).toBe(true)
      expect(call.text).toContain(COMMERCIAL_AD_DISCLOSURE)
      expect(call.text).toContain('1 Market St, Atlanta, GA 30303')
      expect(call.html).toContain('Unsubscribe')
      expect(call.html).toContain(COMMERCIAL_AD_DISCLOSURE)
      const listUnsub = call.headers['List-Unsubscribe']
      const url = listUnsub.slice(1, -1)
      expect(call.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
      expect(verifyUnsubscribeToken(decodeURIComponent(url.split('token=')[1]))).toBe('owner@example.com')
      expect(call.text).toContain(url)
      const productLinks = body.match(/https?:\/\/\S+/g) ?? []
      expect(productLinks).toEqual(['https://example.test/enroll/tok?subscribe=1'])
      expect(call.bcc).toBeUndefined()
      expect(call.text).not.toContain('We are going to launch soon')
      delete process.env.CAMPAIGN_POSTAL_ADDRESS
    })

    it('refuses a commercial notice without a postal address or to a suppressed address', async () => {
      delete process.env.CAMPAIGN_POSTAL_ADDRESS
      await expect(sendCommercialNotice('owner@example.com', 'Subject', 'Body')).rejects.toThrow(/CAMPAIGN_POSTAL_ADDRESS/)
      expect(sendMock).not.toHaveBeenCalled()

      process.env.CAMPAIGN_POSTAL_ADDRESS = '1 Market St, Atlanta, GA 30303'
      isSuppressedMock.mockResolvedValue(true)
      await expect(sendCommercialNotice('owner@example.com', 'Subject', 'Ends soon')).rejects.toBeInstanceOf(
        SuppressedError
      )
      expect(sendMock).not.toHaveBeenCalled()
      delete process.env.CAMPAIGN_POSTAL_ADDRESS
    })

    it('keeps the compliant footer on subscription mail even when suppression is not enforced', async () => {
      process.env.CAMPAIGN_POSTAL_ADDRESS = '1 Market St, Atlanta, GA 30303'
      isSuppressedMock.mockResolvedValue(true)
      const body = subscriptionConfirmationBody({
        businessName: 'Acme Plumbing',
        accountEmail: 'owner@acme.example',
      })

      await sendCommercialNotice('owner@acme.example', 'Your QuickProList subscription', body, {
        enforceSuppression: false,
      })

      const call = sendMock.mock.calls[0][0] as { html: string; text: string; headers: Record<string, string> }
      expect(call.text).toContain('$29.99/month. The plan renews automatically every month until you cancel.')
      expect(call.text).toContain('Billing starts the day you subscribe.')
      expect(call.html).toContain('href="mailto:contact@quickprolist.com?subject=Cancel%20QuickProList%20subscription')
      expect(call.text).toContain(COMMERCIAL_AD_DISCLOSURE)
      expect(call.text).toContain('1 Market St, Atlanta, GA 30303')
      expect(call.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
      expect(call.html).toContain('Unsubscribe')

      sendMock.mockClear()
      await sendCommercialNotice(
        'owner@acme.example',
        'Your QuickProList subscription renews on November 17, 2026',
        subscriptionRenewalBody({
          businessName: 'Acme Plumbing',
          accountEmail: 'owner@acme.example',
          renewalDate: 'November 17, 2026',
        }),
        { enforceSuppression: false }
      )
      const renewal = sendMock.mock.calls[0][0] as { text: string; html: string }
      expect(renewal.text).toContain('renews on November 17, 2026')
      expect(renewal.text).toContain(COMMERCIAL_AD_DISCLOSURE)
      expect(renewal.html).toContain('mailto:contact@quickprolist.com?subject=Cancel%20QuickProList%20subscription')
      delete process.env.CAMPAIGN_POSTAL_ADDRESS
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
