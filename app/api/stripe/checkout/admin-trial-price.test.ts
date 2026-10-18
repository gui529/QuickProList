import { beforeEach, describe, expect, it, vi } from 'vitest'

const { queryMock, createCheckoutSessionMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  createCheckoutSessionMock: vi.fn(async () => 'https://checkout.stripe.test/session'),
}))

vi.mock('@/lib/db', () => ({
  isDatabaseConfigured: () => true,
  query: (...args: unknown[]) => queryMock(...args),
}))

vi.mock('@/lib/stripe', () => ({
  createCheckoutSession: (...args: unknown[]) => createCheckoutSessionMock(...args),
}))

import { POST } from './route'
import { createTrialInvitation } from '@/lib/invitations'
import { SUBSCRIPTION_MONTHLY_PRICE_USD } from '@/lib/subscription-terms'

const TOKEN = '33333333-3333-4333-8333-333333333333'

function trialRow() {
  return {
    id: '6b1b3c2e-8f4a-4c1d-9a2b-111111111111',
    token: TOKEN,
    business_name: 'Admin Trial Plumbing',
    yelp_id: null,
    yelp_data: null,
    category: 'plumbing',
    cities: ['marietta'],
    monthly_price: String(SUBSCRIPTION_MONTHLY_PRICE_USD),
    status: 'trial' as const,
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: 'cur-1',
    created_at: '2026-01-01T00:00:00.000Z',
    expires_at: '2000-01-01T00:00:00.000Z',
    canceled_at: null,
    trial_ends_at: '2099-06-01T00:00:00.000Z',
    contact_email: null,
  }
}

describe('admin-created trial price', () => {
  beforeEach(() => {
    queryMock.mockReset()
    createCheckoutSessionMock.mockClear()
  })

  it('stores 29.99 on an admin trial and checkout accepts that price', async () => {
    queryMock.mockResolvedValue([])
    await createTrialInvitation({
      businessName: 'Admin Trial Plumbing',
      category: 'plumbing',
      cities: ['marietta'],
      trialEndsAt: '2099-06-01T00:00:00.000Z',
      curatedBusinessId: 'cur-1',
    })

    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]
    expect(sql).toContain("'trial'")
    expect(sql).not.toMatch(/,\s*0\s*,\s*'trial'/)
    expect(params[5]).toBe(SUBSCRIPTION_MONTHLY_PRICE_USD)

    queryMock.mockImplementation(async (text: string) => {
      if (String(text).includes('SELECT') && String(text).includes('WHERE token')) return [trialRow()]
      return []
    })

    const res = await POST(
      new Request('https://example.test/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '10.4.4.4',
          origin: 'https://example.test',
        },
        body: JSON.stringify({ token: TOKEN, consent: true }),
      }) as never
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ checkoutUrl: 'https://checkout.stripe.test/session' })
    expect(body.error).toBeUndefined()
    expect(createCheckoutSessionMock).toHaveBeenCalledWith(
      TOKEN,
      'Admin Trial Plumbing',
      SUBSCRIPTION_MONTHLY_PRICE_USD,
      expect.stringContaining(`/enroll/${TOKEN}`)
    )
  })
})
