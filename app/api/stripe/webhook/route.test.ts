import { describe, expect, it, beforeEach, vi } from 'vitest'

// Route the webhook handler's dependencies at test doubles / mocks instead
// of the real Supabase- and Stripe-backed modules, per QPL-001's pattern.
const {
  constructEventMock,
  handleSubscriptionCanceledMock,
  addCuratedFromYelpMock,
  addCuratedManualMock,
  supabaseSingleMock,
} = vi.hoisted(() => {
  // route.ts reads STRIPE_WEBHOOK_SECRET as a module-level constant, so it
  // must be set before the module graph is imported below.
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  process.env.SUPABASE_URL = 'https://example.test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

  const constructEventMock = vi.fn()
  const handleSubscriptionCanceledMock = vi.fn()
  const addCuratedFromYelpMock = vi.fn().mockResolvedValue(undefined)
  const addCuratedManualMock = vi.fn().mockResolvedValue(undefined)
  const supabaseSingleMock = vi.fn().mockResolvedValue({ data: { id: 'curated-1' } })
  return {
    constructEventMock,
    handleSubscriptionCanceledMock,
    addCuratedFromYelpMock,
    addCuratedManualMock,
    supabaseSingleMock,
  }
})

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent: constructEventMock } }),
  handleSubscriptionCanceled: handleSubscriptionCanceledMock,
}))

vi.mock('@/lib/kv', () => ({
  addCuratedFromYelp: addCuratedFromYelpMock,
  addCuratedManual: addCuratedManualMock,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({ single: supabaseSingleMock }),
            }),
          }),
          single: supabaseSingleMock,
        }),
      }),
    }),
  }),
}))

vi.mock('@/lib/invitations', async () => import('@/lib/invitations.test-double'))

import { POST } from './route'
import {
  __reset as resetInvitations,
  __seed as seedInvitation,
  getInvitationByToken,
} from '@/lib/invitations.test-double'

function makeRequest(): Request {
  return new Request('https://example.test/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'test-signature' },
    body: JSON.stringify({ type: 'checkout.session.completed' }),
  })
}

describe('POST /api/stripe/webhook (idempotency)', () => {
  beforeEach(() => {
    resetInvitations()
    constructEventMock.mockClear()
    handleSubscriptionCanceledMock.mockClear()
    addCuratedFromYelpMock.mockClear()
    addCuratedManualMock.mockClear()
    supabaseSingleMock.mockClear()
  })

  it('only inserts the curated business once when Stripe retries the same event', async () => {
    const invitation = seedInvitation({
      status: 'pending',
      business_name: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['austin'],
    })

    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          subscription: 'sub_test_456',
          metadata: { invitationToken: invitation.token },
        },
      },
    }
    constructEventMock.mockReturnValue(event)

    const first = await POST(makeRequest() as never)
    expect(first.status).toBe(200)
    expect(addCuratedManualMock).toHaveBeenCalledTimes(1)

    const paidInvitation = await getInvitationByToken(invitation.token)
    expect(paidInvitation?.status).toBe('paid')

    // Simulate Stripe retrying the same webhook event (e.g. after a timeout).
    const second = await POST(makeRequest() as never)
    expect(second.status).toBe(200)

    expect(addCuratedManualMock).toHaveBeenCalledTimes(1)
    expect(addCuratedFromYelpMock).not.toHaveBeenCalled()
  })
})
