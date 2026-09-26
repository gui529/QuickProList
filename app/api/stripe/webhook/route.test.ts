import { describe, expect, it, beforeEach, vi } from 'vitest'

// Route the webhook handler's dependencies at test doubles / mocks instead
// of the real Supabase- and Stripe-backed modules, per QPL-001's pattern.
const {
  constructEventMock,
  handleSubscriptionCanceledMock,
  addCuratedFromYelpMock,
  addCuratedManualMock,
  setCuratedContactEmailMock,
  getCuratedByIdMock,
  sendEmailMock,
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
  const setCuratedContactEmailMock = vi.fn().mockResolvedValue(undefined)
  const getCuratedByIdMock = vi.fn()
  const sendEmailMock = vi.fn().mockResolvedValue('email-id')
  const supabaseSingleMock = vi.fn().mockResolvedValue({ data: { id: 'curated-1' } })
  return {
    constructEventMock,
    handleSubscriptionCanceledMock,
    addCuratedFromYelpMock,
    addCuratedManualMock,
    setCuratedContactEmailMock,
    getCuratedByIdMock,
    sendEmailMock,
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
  setCuratedContactEmail: setCuratedContactEmailMock,
  getCuratedById: getCuratedByIdMock,
}))

vi.mock('@/lib/email', () => ({
  sendEmail: sendEmailMock,
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
    setCuratedContactEmailMock.mockClear()
    getCuratedByIdMock.mockReset()
    sendEmailMock.mockClear()
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

  it('persists customer_details.email onto the curated business on checkout.session.completed', async () => {
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
          customer_details: { email: 'owner@acmeplumbing.test' },
        },
      },
    }
    constructEventMock.mockReturnValue(event)

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(setCuratedContactEmailMock).toHaveBeenCalledWith('curated-1', 'owner@acmeplumbing.test')
  })

  it('does not persist a contact email when customer_details is absent', async () => {
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

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(setCuratedContactEmailMock).not.toHaveBeenCalled()
  })
})

describe('POST /api/stripe/webhook (subscription status handling)', () => {
  beforeEach(() => {
    resetInvitations()
    constructEventMock.mockClear()
    handleSubscriptionCanceledMock.mockClear()
    addCuratedFromYelpMock.mockClear()
    addCuratedManualMock.mockClear()
    setCuratedContactEmailMock.mockClear()
    getCuratedByIdMock.mockReset()
    sendEmailMock.mockClear()
    supabaseSingleMock.mockClear()
  })

  it('does not delist on customer.subscription.updated with status past_due (grace period)', async () => {
    const event = {
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_test_789', status: 'past_due' } },
    }
    constructEventMock.mockReturnValue(event)

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(handleSubscriptionCanceledMock).not.toHaveBeenCalled()
  })

  it.each(['canceled', 'unpaid'])(
    'delists on customer.subscription.updated with terminal status %s',
    async (status) => {
      const event = {
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_test_789', status } },
      }
      constructEventMock.mockReturnValue(event)

      const res = await POST(makeRequest() as never)
      expect(res.status).toBe(200)
      expect(handleSubscriptionCanceledMock).toHaveBeenCalledWith('sub_test_789')
    }
  )
})

describe('POST /api/stripe/webhook (dunning notice on invoice.payment_failed)', () => {
  beforeEach(() => {
    resetInvitations()
    constructEventMock.mockClear()
    handleSubscriptionCanceledMock.mockClear()
    addCuratedFromYelpMock.mockClear()
    addCuratedManualMock.mockClear()
    setCuratedContactEmailMock.mockClear()
    getCuratedByIdMock.mockReset()
    sendEmailMock.mockClear()
    supabaseSingleMock.mockClear()
  })

  function makeInvoiceFailedEvent(subscriptionId: string) {
    return {
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_test_1',
          parent: { subscription_details: { subscription: subscriptionId } },
        },
      },
    }
  }

  it('sends a dunning email when the business has a contact_email on file', async () => {
    const invitation = seedInvitation({
      status: 'paid',
      stripe_subscription_id: 'sub_dunning_1',
      curated_business_id: 'curated-dunning-1',
    })
    getCuratedByIdMock.mockResolvedValue({
      id: invitation.curated_business_id,
      name: 'Acme Plumbing',
      contactEmail: 'owner@acmeplumbing.test',
    })
    constructEventMock.mockReturnValue(makeInvoiceFailedEvent('sub_dunning_1'))

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(getCuratedByIdMock).toHaveBeenCalledWith('curated-dunning-1')
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][0]).toBe('owner@acmeplumbing.test')
    expect(sendEmailMock.mock.calls[0][1]).toBe('Acme Plumbing')
  })

  it('is a no-op when the business has no contact_email on file', async () => {
    const invitation = seedInvitation({
      status: 'paid',
      stripe_subscription_id: 'sub_dunning_2',
      curated_business_id: 'curated-dunning-2',
    })
    getCuratedByIdMock.mockResolvedValue({
      id: invitation.curated_business_id,
      name: 'Acme Plumbing',
      contactEmail: undefined,
    })
    constructEventMock.mockReturnValue(makeInvoiceFailedEvent('sub_dunning_2'))

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('is a no-op when no invitation matches the subscription id', async () => {
    constructEventMock.mockReturnValue(makeInvoiceFailedEvent('sub_unknown'))

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(getCuratedByIdMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
