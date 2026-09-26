import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

// Only stub out `getInvitationByToken` (so the test doesn't need live
// Supabase credentials) — keep the real `isInvitationExpired` so this test
// exercises the checkout route's actual expiration enforcement, not a mock
// of it.
const { getInvitationByTokenMock, createCheckoutSessionMock } = vi.hoisted(() => ({
  getInvitationByTokenMock: vi.fn(),
  createCheckoutSessionMock: vi.fn().mockResolvedValue('https://checkout.stripe.test/session'),
}))
vi.mock('@/lib/invitations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/invitations')>()
  return { ...actual, getInvitationByToken: getInvitationByTokenMock }
})
vi.mock('@/lib/stripe', () => ({
  createCheckoutSession: createCheckoutSessionMock,
}))

import { POST } from './route'
import type { EnrollmentInvitation } from '@/lib/invitations'

function makeInvitation(overrides: Partial<EnrollmentInvitation> = {}): EnrollmentInvitation {
  return {
    id: 'invitation-1',
    token: 'test-token',
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

function makeRequest(token: string, ip: string): Request {
  return new Request('https://example.test/api/stripe/checkout', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip, origin: 'https://example.test' },
    body: JSON.stringify({ token }),
  })
}

describe('POST /api/stripe/checkout (expiration enforcement)', () => {
  beforeEach(() => {
    getInvitationByTokenMock.mockReset()
    createCheckoutSessionMock.mockClear()
  })

  it('rejects a pending invitation whose expires_at has passed with a 410', async () => {
    const invitation = makeInvitation({ expires_at: new Date(Date.now() - 1000).toISOString() })
    getInvitationByTokenMock.mockResolvedValue(invitation)

    const res = await POST(makeRequest(invitation.token, '10.0.0.1') as never)

    expect(res.status).toBe(410)
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
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
      body: JSON.stringify({ token: invitation.token }),
    })
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    expect(returnUrlArg()).toBe(`https://www.quickprolist.com/enroll/${invitation.token}`)
  })
})
