import { describe, expect, it, beforeEach, vi } from 'vitest'

// Route the webhook handler's dependencies at test doubles / mocks instead
// of the real Supabase- and Stripe-backed modules, per QPL-001's pattern.
const {
  constructEventMock,
  handleSubscriptionCanceledMock,
  addCuratedFromYelpMock,
  addCuratedManualMock,
  updateCuratedManualMock,
  setCuratedContactEmailMock,
  getCuratedByIdMock,
  findCuratedIdByYelpIdMock,
  findLatestManualCuratedIdMock,
  sendEmailMock,
} = vi.hoisted(() => {
  // route.ts reads STRIPE_WEBHOOK_SECRET as a module-level constant, so it
  // must be set before the module graph is imported below.
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'

  const constructEventMock = vi.fn()
  const handleSubscriptionCanceledMock = vi.fn()
  const addCuratedFromYelpMock = vi.fn().mockResolvedValue(undefined)
  const addCuratedManualMock = vi.fn().mockResolvedValue(undefined)
  const updateCuratedManualMock = vi.fn().mockResolvedValue(undefined)
  const setCuratedContactEmailMock = vi.fn().mockResolvedValue(undefined)
  const getCuratedByIdMock = vi.fn()
  const findCuratedIdByYelpIdMock = vi.fn().mockResolvedValue('curated-1')
  const findLatestManualCuratedIdMock = vi.fn().mockResolvedValue('curated-1')
  const sendEmailMock = vi.fn().mockResolvedValue('email-id')
  return {
    constructEventMock,
    handleSubscriptionCanceledMock,
    addCuratedFromYelpMock,
    addCuratedManualMock,
    updateCuratedManualMock,
    setCuratedContactEmailMock,
    getCuratedByIdMock,
    findCuratedIdByYelpIdMock,
    findLatestManualCuratedIdMock,
    sendEmailMock,
  }
})

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent: constructEventMock } }),
  handleSubscriptionCanceled: handleSubscriptionCanceledMock,
}))

vi.mock('@/lib/kv', () => ({
  addCuratedFromYelp: addCuratedFromYelpMock,
  addCuratedManual: addCuratedManualMock,
  updateCuratedManual: updateCuratedManualMock,
  setCuratedContactEmail: setCuratedContactEmailMock,
  getCuratedById: getCuratedByIdMock,
  publishCurated: vi.fn().mockResolvedValue(undefined),
  findCuratedIdByYelpId: findCuratedIdByYelpIdMock,
  findLatestManualCuratedId: findLatestManualCuratedIdMock,
}))

vi.mock('@/lib/email', () => ({
  sendEmail: sendEmailMock,
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
    updateCuratedManualMock.mockClear()
    setCuratedContactEmailMock.mockClear()
    getCuratedByIdMock.mockReset()
    sendEmailMock.mockClear()
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

  // Regression test for #35: enrolling a business that is already a manual
  // curated_businesses row must update that row rather than inserting a
  // second, bare duplicate.
  it('updates the pre-existing curated_businesses row instead of inserting a duplicate when the invitation already links one', async () => {
    const invitation = seedInvitation({
      status: 'pending',
      business_name: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['austin'],
      curated_business_id: 'existing-curated-1',
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

    // Updated the pre-existing row, never inserted a new one.
    expect(updateCuratedManualMock).toHaveBeenCalledWith('existing-curated-1', {
      name: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['austin'],
    })
    expect(addCuratedManualMock).not.toHaveBeenCalled()

    // The invitation's curated_business_id still points at the pre-existing
    // row — markInvitationPaid never overwrote it with a freshly-inserted id.
    const paidInvitation = await getInvitationByToken(invitation.token)
    expect(paidInvitation?.status).toBe('paid')
    expect(paidInvitation?.curated_business_id).toBe('existing-curated-1')
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

describe('POST /api/stripe/webhook (welcome email on checkout.session.completed)', () => {
  beforeEach(() => {
    resetInvitations()
    constructEventMock.mockClear()
    handleSubscriptionCanceledMock.mockClear()
    addCuratedFromYelpMock.mockClear()
    addCuratedManualMock.mockClear()
    updateCuratedManualMock.mockClear()
    setCuratedContactEmailMock.mockClear()
    getCuratedByIdMock.mockReset()
    sendEmailMock.mockClear()
  })

  it('sends a welcome email with the dashboard link when payment succeeds', async () => {
    const invitation = seedInvitation({
      status: 'pending',
      business_name: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['austin'],
    })
    getCuratedByIdMock.mockResolvedValue({
      id: 'curated-1',
      name: 'Acme Plumbing',
      dashboardToken: 'dash-token-123',
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

    expect(getCuratedByIdMock).toHaveBeenCalledWith('curated-1')
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][0]).toBe('owner@acmeplumbing.test')
    expect(sendEmailMock.mock.calls[0][2]).toContain('/dashboard/dash-token-123')
  })

  it('does not send a welcome email when the curated business has no dashboard token', async () => {
    const invitation = seedInvitation({
      status: 'pending',
      business_name: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['austin'],
    })
    getCuratedByIdMock.mockResolvedValue({
      id: 'curated-1',
      name: 'Acme Plumbing',
      dashboardToken: undefined,
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
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('does not send a welcome email when there is no contact email to send it to', async () => {
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
    expect(getCuratedByIdMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})

describe('POST /api/stripe/webhook (subscription status handling)', () => {
  beforeEach(() => {
    resetInvitations()
    constructEventMock.mockClear()
    handleSubscriptionCanceledMock.mockClear()
    addCuratedFromYelpMock.mockClear()
    addCuratedManualMock.mockClear()
    updateCuratedManualMock.mockClear()
    setCuratedContactEmailMock.mockClear()
    getCuratedByIdMock.mockReset()
    sendEmailMock.mockClear()
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
    updateCuratedManualMock.mockClear()
    setCuratedContactEmailMock.mockClear()
    getCuratedByIdMock.mockReset()
    sendEmailMock.mockClear()
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
