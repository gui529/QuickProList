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

const KNOWN_TOKEN = '22222222-2222-4222-8222-222222222222'
const UNKNOWN_TOKEN = '11111111-1111-4111-8111-111111111111'

function invitationRow(token: string) {
  return {
    id: '6b1b3c2e-8f4a-4c1d-9a2b-111111111111',
    token,
    business_name: 'Acme Plumbing',
    yelp_id: null,
    yelp_data: null,
    category: 'plumbing',
    cities: ['austin'],
    monthly_price: '29.99',
    status: 'pending',
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    expires_at: '2099-01-01T00:00:00.000Z',
    canceled_at: null,
    trial_ends_at: null,
    contact_email: null,
  }
}

function makeRequest(token: string, ip: string): Request {
  return new Request('https://example.test/api/stripe/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, origin: 'https://example.test' },
    body: JSON.stringify({ token, consent: true }),
  })
}

describe('POST /api/stripe/checkout token lookup', () => {
  beforeEach(() => {
    queryMock.mockReset()
    createCheckoutSessionMock.mockClear()
    queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      const text = String(sql)
      if (text.includes('SELECT') && text.includes('WHERE token = $1')) {
        return params[0] === KNOWN_TOKEN ? [invitationRow(KNOWN_TOKEN)] : []
      }
      return []
    })
  })

  it.each(['abc', 'not-a-uuid'])('returns 404 for non-UUID token %s without querying', async (token) => {
    const res = await POST(makeRequest(token, `10.9.0.${token.length}`) as never)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Invitation not found' })
    expect(queryMock).not.toHaveBeenCalled()
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('returns 404 when a valid UUID matches no invitation', async () => {
    const res = await POST(makeRequest(UNKNOWN_TOKEN, '10.9.1.1') as never)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Invitation not found' })
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE token = $1'), [UNKNOWN_TOKEN])
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('creates a checkout session for a valid token that exists', async () => {
    const res = await POST(makeRequest(KNOWN_TOKEN, '10.9.1.2') as never)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ checkoutUrl: 'https://checkout.stripe.test/session' })
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE token = $1'), [KNOWN_TOKEN])
    expect(createCheckoutSessionMock).toHaveBeenCalledWith(
      KNOWN_TOKEN,
      'Acme Plumbing',
      29.99,
      expect.stringContaining(`/enroll/${KNOWN_TOKEN}`)
    )
  })
})
