import { describe, expect, it, beforeEach, vi } from 'vitest'

// Route this route's dependencies at mocks / test doubles instead of the
// real Supabase- and Stripe-backed modules, per QPL-001's pattern.
const { getCuratedByDashboardTokenMock, createBillingPortalSessionMock } = vi.hoisted(() => ({
  getCuratedByDashboardTokenMock: vi.fn(),
  createBillingPortalSessionMock: vi.fn().mockResolvedValue('https://billing.stripe.test/session'),
}))

vi.mock('@/lib/kv', () => ({
  getCuratedByDashboardToken: getCuratedByDashboardTokenMock,
}))
vi.mock('@/lib/stripe', () => ({
  createBillingPortalSession: createBillingPortalSessionMock,
}))
vi.mock('@/lib/invitations', async () => import('@/lib/invitations.test-double'))

import { POST } from './route'
import {
  __reset as resetInvitations,
  __seed as seedInvitation,
} from '@/lib/invitations.test-double'

function makeRequest(token: string | undefined, ip: string): Request {
  return new Request('https://example.test/api/stripe/portal', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip, origin: 'https://example.test' },
    body: JSON.stringify({ token }),
  })
}

describe('POST /api/stripe/portal', () => {
  beforeEach(() => {
    resetInvitations()
    getCuratedByDashboardTokenMock.mockReset()
    createBillingPortalSessionMock.mockClear()
  })

  it('returns 404 for a dashboard token that matches no business', async () => {
    getCuratedByDashboardTokenMock.mockResolvedValue(null)

    const res = await POST(makeRequest('bogus-token', '10.1.0.1') as never)

    expect(res.status).toBe(404)
    expect(createBillingPortalSessionMock).not.toHaveBeenCalled()
  })

  it('returns 400 for a valid token with no paid subscription on record', async () => {
    getCuratedByDashboardTokenMock.mockResolvedValue({ id: 'curated-1', name: 'Acme Plumbing' })

    const res = await POST(makeRequest('dashboard-token-1', '10.1.0.2') as never)

    expect(res.status).toBe(400)
    expect(createBillingPortalSessionMock).not.toHaveBeenCalled()
  })

  it('creates a billing portal session with the subscription and a dashboard return URL for a valid token', async () => {
    getCuratedByDashboardTokenMock.mockResolvedValue({ id: 'curated-2', name: 'Acme Plumbing' })
    seedInvitation({
      status: 'paid',
      stripe_subscription_id: 'sub_test_123',
      curated_business_id: 'curated-2',
    })

    const res = await POST(makeRequest('dashboard-token-2', '10.1.0.3') as never)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.url).toBe('https://billing.stripe.test/session')
    expect(createBillingPortalSessionMock).toHaveBeenCalledWith(
      'sub_test_123',
      'https://example.test/dashboard/dashboard-token-2'
    )
  })
})
