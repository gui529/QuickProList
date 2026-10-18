import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendCommercialNotice = vi.hoisted(() =>
  vi.fn<
    (
      to: string,
      subject: string,
      body: string,
      options?: { enforceSuppression?: boolean }
    ) => Promise<string>
  >(async () => 'email_1')
)
const getCuratedById = vi.hoisted(() => vi.fn())

vi.mock('./email', () => ({ sendCommercialNotice }))
vi.mock('./kv', () => ({ getCuratedById }))
vi.mock('./invitations', async () => import('./invitations.test-double'))

import { sendSubscriptionConfirmation, sendUpcomingRenewalNotice } from './subscription-notice'
import { __reset, __seed } from './invitations.test-double'
import { subscriptionDisclosureText } from './subscription-terms'

describe('subscription notices', () => {
  beforeEach(() => {
    __reset()
    sendCommercialNotice.mockClear()
    getCuratedById.mockReset()
    delete process.env.RENEWAL_NOTICE_LEAD_HOURS
  })

  it('sends the confirmation with the terms and does not let a marketing opt-out block it', async () => {
    await sendSubscriptionConfirmation({
      businessName: 'Acme Plumbing',
      accountEmail: 'owner@acme.example',
    })

    expect(sendCommercialNotice).toHaveBeenCalledTimes(1)
    const [to, subject, body, options] = sendCommercialNotice.mock.calls[0]
    expect(to).toBe('owner@acme.example')
    expect(subject).toBe('Your QuickProList subscription')
    expect(body).toContain(subscriptionDisclosureText())
    expect(body).toContain('mailto:contact@quickprolist.com?subject=Cancel%20QuickProList%20subscription')
    expect(options).toEqual({ enforceSuppression: false })
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
    expect(sendCommercialNotice.mock.calls[0][1]).toBe('Your QuickProList subscription renews on November 4, 2026')
    expect(sendCommercialNotice.mock.calls[0][3]).toEqual({ enforceSuppression: false })

    const again = await sendUpcomingRenewalNotice(
      {
        period_end: renewsAt / 1000,
        customer_email: 'owner@acme.example',
        parent: { subscription_details: { subscription: 'sub_1' } },
      },
      now
    )
    expect(again).toBe('skipped')
    expect(sendCommercialNotice).toHaveBeenCalledTimes(1)
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
    expect(sendCommercialNotice).not.toHaveBeenCalled()
  })
})
