import { describe, expect, it, beforeEach, vi } from 'vitest'

// Route the webhook handler's dependencies at test doubles / mocks instead
// of the real Neon- and Stripe-backed modules, per QPL-001's pattern.
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
  clearCuratedTrialMock,
  sendEmailMock,
  sendCommercialNoticeMock,
  subscriptionsRetrieveMock,
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
  const clearCuratedTrialMock = vi.fn().mockResolvedValue(undefined)
  const sendEmailMock = vi.fn().mockResolvedValue('email-id')
  const sendCommercialNoticeMock = vi.fn().mockResolvedValue('email-id')
  const subscriptionsRetrieveMock = vi.fn(async () => ({
    items: { data: [{ current_period_end: Math.floor(Date.UTC(2026, 10, 17, 16) / 1000) }] },
  }))
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
    clearCuratedTrialMock,
    sendEmailMock,
    sendCommercialNoticeMock,
    subscriptionsRetrieveMock,
  }
})

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: constructEventMock },
    subscriptions: { retrieve: subscriptionsRetrieveMock },
  }),
  handleSubscriptionCanceled: handleSubscriptionCanceledMock,
}))

vi.mock('@/lib/kv', () => ({
  addCuratedFromYelp: addCuratedFromYelpMock,
  addCuratedManual: addCuratedManualMock,
  updateCuratedManual: updateCuratedManualMock,
  setCuratedContactEmail: setCuratedContactEmailMock,
  getCuratedById: getCuratedByIdMock,
  publishCurated: vi.fn().mockResolvedValue(undefined),
  clearCuratedTrial: clearCuratedTrialMock,
  findCuratedIdByYelpId: findCuratedIdByYelpIdMock,
  findLatestManualCuratedId: findLatestManualCuratedIdMock,
}))

vi.mock('@/lib/email', () => ({
  sendEmail: sendEmailMock,
  sendCommercialNotice: sendCommercialNoticeMock,
  campaignPostalAddress: () => process.env.CAMPAIGN_POSTAL_ADDRESS?.trim() || null,
  usableCampaignPostalAddress: (value?: string | null) => {
    const postal = value?.trim() ?? ''
    if (!postal || postal.includes('{postalAddress}')) return null
    return postal
  },
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
    sendCommercialNoticeMock.mockClear()
    delete process.env.PRO_DASHBOARD_ENABLED
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

describe('POST /api/stripe/webhook (subscription confirmation on checkout.session.completed)', () => {
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
    sendCommercialNoticeMock.mockClear()
    delete process.env.PRO_DASHBOARD_ENABLED
  })

  function paidEvent(token: string, email?: string) {
    return {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          subscription: 'sub_test_456',
          metadata: { invitationToken: token },
          ...(email ? { customer_details: { email } } : {}),
        },
      },
    }
  }

  it('sends a transactional confirmation with price, auto-renew, next charge, and cancel mailto', async () => {
    process.env.PRO_DASHBOARD_ENABLED = 'true'
    process.env.SITE_URL = 'https://www.quickprolist.com'
    const invitation = seedInvitation({
      status: 'pending',
      business_name: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['austin'],
    })
    constructEventMock.mockReturnValue(paidEvent(invitation.token, 'owner@acmeplumbing.test'))

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)

    expect(clearCuratedTrialMock).toHaveBeenCalledWith('curated-1')
    expect(sendCommercialNoticeMock).not.toHaveBeenCalled()
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const [to, name, body, options] = sendEmailMock.mock.calls[0]
    expect(to).toBe('owner@acmeplumbing.test')
    expect(name).toBe('Acme Plumbing')
    expect(options).toEqual({
      kind: 'transactional',
      subject: 'Your QuickProList subscription is active',
    })
    expect(body).toContain('Plan: QuickProList listing, $29.99/month.')
    expect(body).toContain(
      'Your subscription renews automatically every month until you cancel. Next charge: November 17, 2026.'
    )
    expect(body).toContain('mailto:contact@quickprolist.com?subject=Cancel%20QuickProList%20subscription')
    expect(body).toContain('Questions: contact@quickprolist.com')
    expect(decodeURIComponent(body)).toContain('owner@acmeplumbing.test')
    expect(body).not.toContain('/dashboard/')
    expect(body).not.toContain('This is an advertisement')
    expect(body).not.toMatch(/unsubscribe/i)

    const paid = await getInvitationByToken(invitation.token)
    expect(paid?.subscription_confirmation_sent_at).toBeTruthy()

    const retry = await POST(makeRequest() as never)
    expect(retry.status).toBe(200)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(addCuratedManualMock).toHaveBeenCalledTimes(1)
  })

  it('still sends the confirmation when the pro dashboard flag is off, without a dashboard link', async () => {
    const invitation = seedInvitation({
      status: 'pending',
      business_name: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['austin'],
    })
    constructEventMock.mockReturnValue(paidEvent(invitation.token, 'owner@acmeplumbing.test'))

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(sendCommercialNoticeMock).not.toHaveBeenCalled()
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][2]).toContain('Plan: QuickProList listing, $29.99/month.')
    expect(sendEmailMock.mock.calls[0][2]).not.toContain('/dashboard/')
  })

  it('does not add a dashboard link when the curated business has no dashboard token', async () => {
    process.env.PRO_DASHBOARD_ENABLED = 'true'
    const invitation = seedInvitation({
      status: 'pending',
      business_name: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['austin'],
    })
    constructEventMock.mockReturnValue(paidEvent(invitation.token, 'owner@acmeplumbing.test'))

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][2]).not.toContain('/dashboard/')
    expect(sendCommercialNoticeMock).not.toHaveBeenCalled()
  })

  it('does not send a confirmation when there is no contact email', async () => {
    const invitation = seedInvitation({
      status: 'pending',
      business_name: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['austin'],
    })
    constructEventMock.mockReturnValue(paidEvent(invitation.token))

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(getCuratedByIdMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(sendCommercialNoticeMock).not.toHaveBeenCalled()
  })

  it('retries a missed confirmation after the invitation is already paid', async () => {
    const invitation = seedInvitation({
      status: 'paid',
      business_name: 'Acme Plumbing',
      curated_business_id: 'curated-1',
      subscription_confirmation_sent_at: null,
    })
    constructEventMock.mockReturnValue(paidEvent(invitation.token, 'owner@acmeplumbing.test'))

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(addCuratedManualMock).not.toHaveBeenCalled()
    expect(sendCommercialNoticeMock).not.toHaveBeenCalled()
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][2]).toContain('mailto:contact@quickprolist.com?subject=Cancel%20QuickProList%20subscription')
    expect(sendEmailMock.mock.calls[0][2]).toContain('Next charge: November 17, 2026.')
  })
})

describe('POST /api/stripe/webhook (renewal notice on invoice.upcoming)', () => {
  beforeEach(() => {
    resetInvitations()
    constructEventMock.mockClear()
    sendCommercialNoticeMock.mockClear()
    sendEmailMock.mockClear()
    getCuratedByIdMock.mockReset()
    delete process.env.RENEWAL_NOTICE_LEAD_HOURS
  })

  function upcomingEvent(subscriptionId: string, periodEndSec: number) {
    return {
      type: 'invoice.upcoming',
      data: {
        object: {
          customer_email: 'billing@acmeplumbing.test',
          period_end: periodEndSec,
          lines: {
            data: [{ period: { start: periodEndSec, end: periodEndSec + 30 * 24 * 60 * 60 } }],
          },
          parent: { subscription_details: { subscription: subscriptionId } },
        },
      },
    }
  }

  it('sends a notice inside the lead window and does not send it again for the same period', async () => {
    seedInvitation({
      status: 'paid',
      business_name: 'Acme Plumbing',
      stripe_subscription_id: 'sub_renew_1',
      curated_business_id: 'curated-renew-1',
      contact_email: 'owner@acmeplumbing.test',
    })
    getCuratedByIdMock.mockResolvedValue({
      id: 'curated-renew-1',
      contactEmail: 'owner@acmeplumbing.test',
    })
    const periodEnd = Math.floor((Date.now() + 5 * 24 * 60 * 60 * 1000) / 1000)
    constructEventMock.mockReturnValue(upcomingEvent('sub_renew_1', periodEnd))

    const first = await POST(makeRequest() as never)
    expect(first.status).toBe(200)
    expect(sendCommercialNoticeMock).not.toHaveBeenCalled()
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const [to, , body, options] = sendEmailMock.mock.calls[0]
    expect(to).toBe('owner@acmeplumbing.test')
    expect(options.subject).toMatch(/^Your QuickProList subscription renews on /)
    expect(options.kind).toBe('transactional')
    expect(body).toContain('Plan: QuickProList listing, $29.99/month.')
    expect(body).toContain('Your subscription renews automatically every month until you cancel. Next charge:')
    expect(body).toContain('mailto:contact@quickprolist.com?subject=Cancel%20QuickProList%20subscription')
    expect(body).not.toContain('This is an advertisement')
    expect(body).not.toMatch(/unsubscribe/i)
    expect(decodeURIComponent(body)).toContain('Acme Plumbing')
    expect(decodeURIComponent(body)).toContain('owner@acmeplumbing.test')
    expect(body).not.toContain('Billing starts the day you subscribe.')

    const second = await POST(makeRequest() as never)
    expect(second.status).toBe(200)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it('skips an upcoming invoice outside the lead window', async () => {
    seedInvitation({
      status: 'paid',
      business_name: 'Acme Plumbing',
      stripe_subscription_id: 'sub_renew_far',
      contact_email: 'owner@acmeplumbing.test',
    })
    const periodEnd = Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)
    constructEventMock.mockReturnValue(upcomingEvent('sub_renew_far', periodEnd))

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(sendCommercialNoticeMock).not.toHaveBeenCalled()
  })

  it('reads the subscription id from invoice.subscription when parent details are absent', async () => {
    seedInvitation({
      status: 'paid',
      business_name: 'Acme Plumbing',
      stripe_subscription_id: 'sub_legacy',
      contact_email: 'owner@acmeplumbing.test',
    })
    const periodEnd = Math.floor((Date.now() + 2 * 24 * 60 * 60 * 1000) / 1000)
    constructEventMock.mockReturnValue({
      type: 'invoice.upcoming',
      data: {
        object: {
          customer_email: 'owner@acmeplumbing.test',
          subscription: 'sub_legacy',
          lines: { data: [{ period: { start: periodEnd, end: periodEnd + 1000 } }] },
        },
      },
    })

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendCommercialNoticeMock).not.toHaveBeenCalled()
  })
})

describe('POST /api/stripe/webhook (renewal receipt on invoice.paid)', () => {
  beforeEach(() => {
    resetInvitations()
    constructEventMock.mockClear()
    sendEmailMock.mockClear()
    sendCommercialNoticeMock.mockClear()
    getCuratedByIdMock.mockReset()
  })

  function paidInvoice(billingReason: string, id: string) {
    return {
      type: 'invoice.paid',
      data: {
        object: {
          id,
          billing_reason: billingReason,
          amount_paid: 2999,
          status_transitions: { paid_at: Math.floor(Date.UTC(2026, 10, 17, 16) / 1000) },
          customer_email: 'billing@acmeplumbing.test',
          parent: { subscription_details: { subscription: 'sub_paid_1' } },
          lines: {
            data: [{ period: { end: Math.floor(Date.UTC(2026, 11, 17, 16) / 1000) } }],
          },
        },
      },
    }
  }

  it('does not send a renewal receipt for the first invoice', async () => {
    seedInvitation({
      status: 'paid',
      business_name: 'Acme Plumbing',
      stripe_subscription_id: 'sub_paid_1',
      contact_email: 'owner@acmeplumbing.test',
    })
    constructEventMock.mockReturnValue(paidInvoice('subscription_create', 'in_first'))

    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(sendCommercialNoticeMock).not.toHaveBeenCalled()
  })

  it('sends one transactional renewal receipt for a renewal invoice', async () => {
    seedInvitation({
      status: 'paid',
      business_name: 'Acme Plumbing',
      stripe_subscription_id: 'sub_paid_1',
      curated_business_id: 'curated-paid-1',
      contact_email: 'owner@acmeplumbing.test',
    })
    getCuratedByIdMock.mockResolvedValue({
      id: 'curated-paid-1',
      contactEmail: 'owner@acmeplumbing.test',
    })
    constructEventMock.mockReturnValue(paidInvoice('subscription_cycle', 'in_renew'))

    const first = await POST(makeRequest() as never)
    expect(first.status).toBe(200)
    expect(sendCommercialNoticeMock).not.toHaveBeenCalled()
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const [to, , body, options] = sendEmailMock.mock.calls[0]
    expect(to).toBe('owner@acmeplumbing.test')
    expect(options).toEqual({
      kind: 'transactional',
      subject: 'Your QuickProList subscription renewed',
    })
    expect(body).toContain('We charged $29.99 for your QuickProList listing for Acme Plumbing on November 17, 2026.')
    expect(body).toContain(
      'Your subscription renews automatically every month until you cancel. Next charge: December 17, 2026.'
    )
    expect(body).toContain('mailto:contact@quickprolist.com?subject=Cancel%20QuickProList%20subscription')
    expect(body).toContain('Questions: contact@quickprolist.com')
    expect(body).not.toContain('This is an advertisement')
    expect(body).not.toMatch(/unsubscribe/i)

    const second = await POST(makeRequest() as never)
    expect(second.status).toBe(200)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
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
    sendCommercialNoticeMock.mockClear()
    delete process.env.PRO_DASHBOARD_ENABLED
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
    sendCommercialNoticeMock.mockClear()
    delete process.env.PRO_DASHBOARD_ENABLED
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
