import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

// Only stub out `getInvitationByToken` (so the test doesn't need live
// DATABASE_URL) — keep the real `isInvitationExpired` so this test
// exercises the checkout route's actual expiration enforcement, not a mock
// of it.
const { getInvitationByTokenMock, createCheckoutSessionMock, recordSubscriptionConsentMock } = vi.hoisted(() => ({
  getInvitationByTokenMock: vi.fn(),
  createCheckoutSessionMock: vi.fn().mockResolvedValue('https://checkout.stripe.test/session'),
  recordSubscriptionConsentMock: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/invitations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/invitations')>()
  return {
    ...actual,
    getInvitationByToken: getInvitationByTokenMock,
    recordSubscriptionConsent: recordSubscriptionConsentMock,
  }
})
vi.mock('@/lib/stripe', () => ({
  createCheckoutSession: createCheckoutSessionMock,
}))

import { POST } from './route'
import type { EnrollmentInvitation } from '@/lib/invitations'
import {
  SUBSCRIPTION_CONSENT_REQUIRED_ERROR,
  SUBSCRIPTION_PRICE_MISMATCH_ERROR,
  subscriptionDisclosureText,
} from '@/lib/subscription-terms'

function makeInvitation(overrides: Partial<EnrollmentInvitation> = {}): EnrollmentInvitation {
  return {
    id: 'invitation-1',
    token: '22222222-2222-4222-8222-222222222222',
    business_name: 'Acme Plumbing',
    yelp_id: null,
    yelp_data: null,
    category: 'plumbing',
    cities: ['austin'],
    monthly_price: 29.99,
    status: 'pending',
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    canceled_at: null,
    trial_ends_at: null,
    ...overrides,
  }
}

function makeRequest(
  token: string,
  ip: string,
  body: Record<string, unknown> = { consent: true }
): Request {
  return new Request('https://example.test/api/stripe/checkout', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip, origin: 'https://example.test' },
    body: JSON.stringify({ token, ...body }),
  })
}

describe('POST /api/stripe/checkout (expiration enforcement)', () => {
  beforeEach(() => {
    getInvitationByTokenMock.mockReset()
    createCheckoutSessionMock.mockClear()
    recordSubscriptionConsentMock.mockClear()
  })

  it('rejects a pending invitation whose expires_at has passed with a 410', async () => {
    const invitation = makeInvitation({ expires_at: new Date(Date.now() - 1000).toISOString() })
    getInvitationByTokenMock.mockResolvedValue(invitation)

    const res = await POST(makeRequest(invitation.token, '10.0.0.1') as never)

    expect(res.status).toBe(410)
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
    expect(recordSubscriptionConsentMock).not.toHaveBeenCalled()
  })

  it('allows a pending invitation whose expires_at is still in the future', async () => {
    const invitation = makeInvitation({ expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString() })
    getInvitationByTokenMock.mockResolvedValue(invitation)

    const res = await POST(makeRequest(invitation.token, '10.0.0.2') as never)

    expect(res.status).toBe(200)
    expect(createCheckoutSessionMock).toHaveBeenCalledTimes(1)
  })
})

describe('POST /api/stripe/checkout (return URL origin)', () => {
  const originalSiteUrl = process.env.SITE_URL

  beforeEach(() => {
    getInvitationByTokenMock.mockReset()
    createCheckoutSessionMock.mockClear()
    recordSubscriptionConsentMock.mockClear()
  })

  afterEach(() => {
    if (originalSiteUrl === undefined) delete process.env.SITE_URL
    else process.env.SITE_URL = originalSiteUrl
  })

  function returnUrlArg(): string {
    // createCheckoutSession(token, businessName, monthlyPrice, returnUrl)
    return createCheckoutSessionMock.mock.calls[0][3]
  }

  it('ignores the Origin header entirely when SITE_URL is set', async () => {
    process.env.SITE_URL = 'https://configured.example.com'
    const invitation = makeInvitation()
    getInvitationByTokenMock.mockResolvedValue(invitation)

    const res = await POST(makeRequest(invitation.token, '10.0.0.3') as never)

    expect(res.status).toBe(200)
    expect(returnUrlArg()).toBe(`https://configured.example.com/enroll/${invitation.token}`)
  })

  it('falls back to the Origin header when SITE_URL is unset', async () => {
    delete process.env.SITE_URL
    const invitation = makeInvitation()
    getInvitationByTokenMock.mockResolvedValue(invitation)

    const res = await POST(makeRequest(invitation.token, '10.0.0.4') as never)

    expect(res.status).toBe(200)
    expect(returnUrlArg()).toBe(`https://example.test/enroll/${invitation.token}`)
  })

  it('falls back to the production domain when neither SITE_URL nor Origin is set', async () => {
    delete process.env.SITE_URL
    const invitation = makeInvitation()
    getInvitationByTokenMock.mockResolvedValue(invitation)

    const req = new Request('https://example.test/api/stripe/checkout', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.5' },
      body: JSON.stringify({ token: invitation.token, consent: true }),
    })
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    expect(returnUrlArg()).toBe(`https://www.quickprolist.com/enroll/${invitation.token}`)
  })
})

describe('POST /api/stripe/checkout (express consent)', () => {
  beforeEach(() => {
    getInvitationByTokenMock.mockReset()
    createCheckoutSessionMock.mockClear()
    recordSubscriptionConsentMock.mockClear()
  })

  it('refuses checkout when the consent box was not checked', async () => {
    const invitation = makeInvitation()
    getInvitationByTokenMock.mockResolvedValue(invitation)

    for (const [ip, body] of [
      ['10.1.0.1', {}],
      ['10.1.0.2', { consent: false }],
    ] as const) {
      const res = await POST(makeRequest(invitation.token, ip, body) as never)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: SUBSCRIPTION_CONSENT_REQUIRED_ERROR })
    }

    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
    expect(recordSubscriptionConsentMock).not.toHaveBeenCalled()
    expect(getInvitationByTokenMock).not.toHaveBeenCalled()
  })

  it('returns 400 and does not start checkout when the invitation price is missing or not 29.99', async () => {
    const cases: Array<{ monthly_price: number; ip: string }> = [
      { monthly_price: 49, ip: '10.2.0.1' },
      { monthly_price: 0, ip: '10.2.0.2' },
      { monthly_price: Number.NaN, ip: '10.2.0.3' },
      { monthly_price: null as unknown as number, ip: '10.2.0.4' },
    ]
    for (const { monthly_price, ip } of cases) {
      const invitation = makeInvitation({ monthly_price })
      getInvitationByTokenMock.mockResolvedValue(invitation)
      const res = await POST(makeRequest(invitation.token, ip) as never)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: SUBSCRIPTION_PRICE_MISMATCH_ERROR })
    }
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
    expect(recordSubscriptionConsentMock).not.toHaveBeenCalled()
  })

  it('records the disclosure and a timestamp, then creates the session', async () => {
    const invitation = makeInvitation()
    getInvitationByTokenMock.mockResolvedValue(invitation)

    const res = await POST(makeRequest(invitation.token, '10.1.0.3') as never)

    expect(res.status).toBe(200)
    expect(recordSubscriptionConsentMock).toHaveBeenCalledTimes(1)
    const [token, text, consentedAt] = recordSubscriptionConsentMock.mock.calls[0]
    expect(token).toBe(invitation.token)
    expect(text).toBe(subscriptionDisclosureText())
    expect(Number.isNaN(Date.parse(consentedAt))).toBe(false)
    expect(createCheckoutSessionMock).toHaveBeenCalledTimes(1)
  })
})
