import { afterEach, describe, expect, it } from 'vitest'
import {
  SUBSCRIPTION_BILLING_STARTS_SENTENCE,
  SUBSCRIPTION_CANCEL_SENTENCE,
  cancelSubscriptionMailto,
  formatSubscriptionPrice,
  isConfiguredSubscriptionPrice,
  renewalNoticeLeadMs,
  shouldSendRenewalNotice,
  subscriptionConfirmationBody,
  subscriptionConfirmationSubject,
  subscriptionDisclosureText,
  subscriptionRenewalBody,
  subscriptionRenewalConfirmationBody,
  subscriptionRenewalConfirmationSubject,
  subscriptionSuccessLine,
} from './subscription-terms'

describe('subscription terms', () => {
  const originalLead = process.env.RENEWAL_NOTICE_LEAD_HOURS

  afterEach(() => {
    if (originalLead === undefined) delete process.env.RENEWAL_NOTICE_LEAD_HOURS
    else process.env.RENEWAL_NOTICE_LEAD_HOURS = originalLead
  })

  it('keeps the checkout disclosure in one string, with billing-starts as the only swappable sentence', () => {
    expect(formatSubscriptionPrice()).toBe('$29.99')
    expect(subscriptionDisclosureText()).toBe(
      '$29.99/month. The plan renews automatically every month until you cancel. ' +
        'To cancel, email contact@quickprolist.com with the subject "Cancel QuickProList subscription." ' +
        'Billing starts the day you subscribe.'
    )
    expect(subscriptionDisclosureText()).toContain(SUBSCRIPTION_BILLING_STARTS_SENTENCE)
    expect(subscriptionDisclosureText()).toContain(SUBSCRIPTION_CANCEL_SENTENCE)

    const swapped = subscriptionDisclosureText('Subscribing now keeps any remaining preview days.')
    expect(swapped).not.toContain(SUBSCRIPTION_BILLING_STARTS_SENTENCE)
    expect(swapped).toContain('Subscribing now keeps any remaining preview days.')
    expect(swapped).toContain('$29.99/month. The plan renews automatically every month until you cancel.')
    expect(swapped).toContain(SUBSCRIPTION_CANCEL_SENTENCE)
  })

  it('accepts only the configured subscription price', () => {
    expect(isConfiguredSubscriptionPrice(29.99)).toBe(true)
    expect(isConfiguredSubscriptionPrice('29.99')).toBe(true)
    expect(isConfiguredSubscriptionPrice('$29.99')).toBe(true)
    expect(isConfiguredSubscriptionPrice(' $29.99 ')).toBe(true)
    for (const price of [null, undefined, '', '   ', 0, 19.99, 30, 49, Number.NaN, '$19.99']) {
      expect(isConfiguredSubscriptionPrice(price)).toBe(false)
    }
  })

  it('renders the success line from the configured price', () => {
    expect(subscriptionSuccessLine('Acme Plumbing', 'Plumbers', 'Austin')).toBe(
      'Acme Plumbing is now listed on QuickProList for Plumbers in Austin. Your $29.99/month subscription renews monthly until you cancel.'
    )
    expect(subscriptionSuccessLine('Acme Plumbing', 'Plumbers', 'Austin')).toContain(formatSubscriptionPrice())
  })

  it('builds a prefilled cancel mailto with the business name and account email', () => {
    const href = cancelSubscriptionMailto('Acme Plumbing', 'owner@acme.example')
    expect(href.startsWith('mailto:contact@quickprolist.com?subject=Cancel%20my%20QuickProList%20subscription&body=')).toBe(
      true
    )
    const body = decodeURIComponent(href.split('body=')[1])
    expect(body).toBe(
      'Please cancel the QuickProList subscription for Acme Plumbing.\nAccount email: owner@acme.example'
    )
  })

  it('puts the plan, auto-renewal, next charge, and cancel mailto in billing emails', () => {
    const cancel = cancelSubscriptionMailto('Acme Plumbing', 'owner@acme.example')
    const confirmation = subscriptionConfirmationBody({
      businessName: 'Acme Plumbing',
      accountEmail: 'owner@acme.example',
      nextChargeDate: 'November 17, 2026',
    })
    expect(subscriptionConfirmationSubject()).toBe('Your QuickProList subscription is active')
    expect(confirmation).toContain('Your QuickProList listing for Acme Plumbing is active.')
    expect(confirmation).toContain('Plan: QuickProList listing, $29.99/month.')
    expect(confirmation).toContain(
      'Your subscription renews automatically every month until you cancel. Next charge: November 17, 2026.'
    )
    expect(confirmation).toContain(`Cancel anytime: ${cancel}`)
    expect(confirmation).toContain('Questions: contact@quickprolist.com')
    expect(confirmation).not.toContain('/dashboard/')
    expect(confirmation).not.toMatch(/unsubscribe/i)
    expect(confirmation).not.toContain('This is an advertisement')

    const renewal = subscriptionRenewalBody({
      businessName: 'Acme Plumbing',
      accountEmail: 'owner@acme.example',
      renewalDate: 'November 17, 2026',
    })
    expect(renewal).toBe(
      'Your QuickProList listing for Acme Plumbing renews automatically on November 17, 2026 for $29.99. ' +
        'It renews every month until you cancel. To stop the renewal, cancel before November 17, 2026: ' +
        `${cancel}. Questions: contact@quickprolist.com`
    )
    expect(renewal).not.toContain(SUBSCRIPTION_BILLING_STARTS_SENTENCE)
    expect(renewal).not.toMatch(/unsubscribe/i)
    expect(renewal).not.toContain('This is an advertisement')

    const receipt = subscriptionRenewalConfirmationBody({
      businessName: 'Acme Plumbing',
      accountEmail: 'owner@acme.example',
      amount: '$29.99',
      chargeDate: 'November 17, 2026',
      nextChargeDate: 'December 17, 2026',
    })
    expect(subscriptionRenewalConfirmationSubject()).toBe('Your QuickProList subscription renewed')
    expect(receipt).toContain(
      'We charged $29.99 for your QuickProList listing for Acme Plumbing on November 17, 2026.'
    )
    expect(receipt).toContain(
      'Your subscription renews automatically every month until you cancel. Next charge: December 17, 2026.'
    )
    expect(receipt).toContain(`Cancel anytime: ${cancel}`)
    expect(receipt).toContain('Questions: contact@quickprolist.com')
    expect(receipt).not.toMatch(/unsubscribe/i)
  })

  it('sends a renewal notice only inside the configured lead time', () => {
    const now = Date.UTC(2026, 10, 1, 12)
    expect(renewalNoticeLeadMs()).toBe(240 * 60 * 60 * 1000)
    expect(shouldSendRenewalNotice(now + 5 * 24 * 60 * 60 * 1000, now)).toBe(true)
    expect(shouldSendRenewalNotice(now + 30 * 24 * 60 * 60 * 1000, now)).toBe(false)
    expect(shouldSendRenewalNotice(now - 1000, now)).toBe(false)

    process.env.RENEWAL_NOTICE_LEAD_HOURS = '24'
    expect(shouldSendRenewalNotice(now + 12 * 60 * 60 * 1000, now)).toBe(true)
    expect(shouldSendRenewalNotice(now + 48 * 60 * 60 * 1000, now)).toBe(false)
  })
})
