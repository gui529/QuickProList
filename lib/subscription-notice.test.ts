import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendEmail = vi.hoisted(() =>
  vi.fn<
    (
      to: string,
      businessName: string,
      body: string,
      options?: { kind?: string; subject?: string }
    ) => Promise<string>
  >(async () => 'email_1')
)
const getCuratedById = vi.hoisted(() => vi.fn())

vi.mock('./email', () => ({
  sendEmail,
  campaignPostalAddress: () => process.env.CAMPAIGN_POSTAL_ADDRESS?.trim() || null,
  usableCampaignPostalAddress: (value?: string | null) => {
    const postal = value?.trim() ?? ''
    if (!postal || postal.includes('{postalAddress}')) return null
    return postal
  },
}))
vi.mock('./kv', () => ({ getCuratedById }))
vi.mock('./invitations', async () => import('./invitations.test-double'))

import {
  sendRenewalConfirmation,
  sendSubscriptionConfirmation,
  sendUpcomingRenewalNotice,
} from './subscription-notice'
import { __reset, __seed } from './invitations.test-double'

describe('subscription notices', () => {
  beforeEach(() => {
    __reset()
    sendEmail.mockClear()
    getCuratedById.mockReset()
    delete process.env.RENEWAL_NOTICE_LEAD_HOURS
    delete process.env.CAMPAIGN_POSTAL_ADDRESS
  })

  it('sends the confirmation on the transactional path with no ad line or unsubscribe', async () => {
    await sendSubscriptionConfirmation({
      businessName: 'Acme Plumbing',
      accountEmail: 'owner@acme.example',
      nextChargeDate: 'November 17, 2026',
    })

    expect(sendEmail).toHaveBeenCalledTimes(1)
    const [to, name, body, options] = sendEmail.mock.calls[0]
    expect(to).toBe('owner@acme.example')
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
    expect(body).not.toMatch(/unsubscribe/i)
    expect(body).not.toContain('This is an advertisement')
    expect(body).not.toContain('/dashboard/')
  })

  it('adds a postal line only when one is configured', async () => {
    process.env.CAMPAIGN_POSTAL_ADDRESS = '1 Market St, Atlanta, GA 30303'
    await sendSubscriptionConfirmation({
      businessName: 'Acme Plumbing',
      accountEmail: 'owner@acme.example',
      nextChargeDate: 'November 17, 2026',
    })
    expect(sendEmail.mock.calls[0][2]).toContain('1 Market St, Atlanta, GA 30303')
    expect(sendEmail.mock.calls[0][2]).not.toMatch(/unsubscribe/i)
  })

  it('uses invoice period_end as the renewal time, not the upcoming service-period end', async () => {
    __seed({
      status: 'paid',
      business_name: 'Acme Plumbing',
      stripe_subscription_id: 'sub_1',
      contact_email: 'owner@acme.example',
    })
    const now = Date.UTC(2026, 10, 1, 12)
    const renewsAt = now + 3 * 24 * 60 * 60 * 1000
    const serviceEnd = now + 33 * 24 * 60 * 60 * 1000

    const sent = await sendUpcomingRenewalNotice(
      {
        period_end: renewsAt / 1000,
        customer_email: 'owner@acme.example',
        parent: { subscription_details: { subscription: 'sub_1' } },
        lines: { data: [{ period: { start: renewsAt / 1000, end: serviceEnd / 1000 } }] },
      },
      now
    )

    expect(sent).toBe('sent')
    expect(sendEmail.mock.calls[0][3]).toEqual({
      kind: 'transactional',
      subject: 'Your QuickProList subscription renews on November 4, 2026',
    })
    expect(sendEmail.mock.calls[0][2]).toContain('Next charge: November 4, 2026.')
    expect(sendEmail.mock.calls[0][2]).toContain('Plan: QuickProList listing, $29.99/month.')
    expect(sendEmail.mock.calls[0][2]).not.toMatch(/unsubscribe/i)

    const again = await sendUpcomingRenewalNotice(
      {
        period_end: renewsAt / 1000,
        customer_email: 'owner@acme.example',
        parent: { subscription_details: { subscription: 'sub_1' } },
      },
      now
    )
    expect(again).toBe('skipped')
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('does not treat a far line-item period end as the renewal date', async () => {
    __seed({
      status: 'paid',
      stripe_subscription_id: 'sub_far',
      contact_email: 'owner@acme.example',
    })
    const now = Date.UTC(2026, 10, 1, 12)
    const result = await sendUpcomingRenewalNotice(
      {
        customer_email: 'owner@acme.example',
        subscription: 'sub_far',
        lines: { data: [{ period: { end: (now + 40 * 24 * 60 * 60 * 1000) / 1000 } }] },
      },
      now
    )
    expect(result).toBe('skipped')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('sends a renewal receipt on subscription_cycle and skips the first invoice', async () => {
    __seed({
      status: 'paid',
      business_name: 'Acme Plumbing',
      stripe_subscription_id: 'sub_cycle',
      contact_email: 'owner@acme.example',
    })
    const first = await sendRenewalConfirmation({
      id: 'in_first',
      billing_reason: 'subscription_create',
      amount_paid: 2999,
      created: Date.UTC(2026, 10, 1) / 1000,
      parent: { subscription_details: { subscription: 'sub_cycle' } },
      lines: { data: [{ period: { end: Date.UTC(2026, 11, 1) / 1000 } }] },
    })
    expect(first).toBe('skipped')
    expect(sendEmail).not.toHaveBeenCalled()

    const paidAt = Date.UTC(2026, 10, 17, 16) / 1000
    const next = Date.UTC(2026, 11, 17, 16) / 1000
    const sent = await sendRenewalConfirmation({
      id: 'in_renew',
      billing_reason: 'subscription_cycle',
      amount_paid: 2999,
      status_transitions: { paid_at: paidAt },
      customer_email: 'owner@acme.example',
      parent: { subscription_details: { subscription: 'sub_cycle' } },
      lines: { data: [{ period: { end: next } }] },
    })
    expect(sent).toBe('sent')
    const [, , body, options] = sendEmail.mock.calls[0]
    expect(options).toEqual({
      kind: 'transactional',
      subject: 'Your QuickProList subscription renewed',
    })
    expect(body).toContain('We charged $29.99 for your QuickProList listing for Acme Plumbing on November 17, 2026.')
    expect(body).toContain('Next charge: December 17, 2026.')
    expect(body).toContain('mailto:contact@quickprolist.com?subject=Cancel%20QuickProList%20subscription')
    expect(body).not.toMatch(/unsubscribe/i)
    expect(body).not.toContain('This is an advertisement')

    const duplicate = await sendRenewalConfirmation({
      id: 'in_renew',
      billing_reason: 'subscription_cycle',
      amount_paid: 2999,
      status_transitions: { paid_at: paidAt },
      parent: { subscription_details: { subscription: 'sub_cycle' } },
      lines: { data: [{ period: { end: next } }] },
    })
    expect(duplicate).toBe('skipped')
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})