import { PUBLIC_CONTACT_EMAIL } from './site-contact'

/** Listed price. Disclosure and the success line render this, not a hardcoded string. */
export const SUBSCRIPTION_MONTHLY_PRICE_USD = 29.99

export function formatSubscriptionPrice(amount = SUBSCRIPTION_MONTHLY_PRICE_USD): string {
  return `$${amount.toFixed(2)}`
}

/**
 * Swappable on its own. Checkout does not set a Stripe trial period, so billing
 * starts the day they subscribe. If early subscribers later keep unused preview
 * days, change this sentence only.
 */
export const SUBSCRIPTION_BILLING_STARTS_SENTENCE = 'Billing starts the day you subscribe.'

export const SUBSCRIPTION_CANCEL_SENTENCE = `To cancel, email ${PUBLIC_CONTACT_EMAIL} with the subject "Cancel QuickProList subscription."`

/** Full checkout disclosure. The billing-starts sentence is the only swappable piece. */
export function subscriptionDisclosureText(
  billingStarts: string = SUBSCRIPTION_BILLING_STARTS_SENTENCE
): string {
  const price = formatSubscriptionPrice()
  return `${price}/month. The plan renews automatically every month until you cancel. ${SUBSCRIPTION_CANCEL_SENTENCE} ${billingStarts}`
}

export function subscriptionSuccessLine(business: string, category: string, cities: string): string {
  const price = formatSubscriptionPrice()
  return `${business} is now listed on QuickProList for ${category} in ${cities}. Your ${price}/month subscription renews monthly until you cancel.`
}

export const SUBSCRIPTION_CONSENT_REQUIRED_ERROR =
  'Check the box to agree to the subscription terms before checkout.'

/** Prepared cancellation email. The customer can send it without adding anything. */
export function cancelSubscriptionMailto(businessName: string, accountEmail?: string | null): string {
  const emailLine = accountEmail?.trim()
    ? `Account email: ${accountEmail.trim()}`
    : 'Account email: (the email on this subscription)'
  const body = `Please cancel the QuickProList subscription for ${businessName}.\n${emailLine}`
  return `mailto:${PUBLIC_CONTACT_EMAIL}?subject=${encodeURIComponent('Cancel QuickProList subscription')}&body=${encodeURIComponent(body)}`
}

/**
 * Hours before a renewal we will still send the notice. Stripe fires
 * `invoice.upcoming` on the dashboard's upcoming-invoice schedule (often
 * several days ahead). The default is 10 days so that event falls inside
 * the window. Set `RENEWAL_NOTICE_LEAD_HOURS` at least as high as Stripe's
 * upcoming-invoice lead.
 */
const DEFAULT_RENEWAL_NOTICE_LEAD_HOURS = 240

export function renewalNoticeLeadMs(): number {
  const raw = process.env.RENEWAL_NOTICE_LEAD_HOURS?.trim()
  if (!raw) return DEFAULT_RENEWAL_NOTICE_LEAD_HOURS * 60 * 60 * 1000
  const hours = parseInt(raw, 10)
  return Number.isFinite(hours) && hours > 0
    ? hours * 60 * 60 * 1000
    : DEFAULT_RENEWAL_NOTICE_LEAD_HOURS * 60 * 60 * 1000
}

export function shouldSendRenewalNotice(renewsAtMs: number, nowMs = Date.now()): boolean {
  if (!Number.isFinite(renewsAtMs)) return false
  const until = renewsAtMs - nowMs
  return until > 0 && until <= renewalNoticeLeadMs()
}

export function subscriptionConfirmationSubject(): string {
  return 'Your QuickProList subscription'
}

export function subscriptionRenewalSubject(renewalDate: string): string {
  return `Your QuickProList subscription renews on ${renewalDate}`
}

export function subscriptionConfirmationBody(input: {
  businessName: string
  accountEmail: string
  dashboardUrl?: string | null
}): string {
  const lines = [
    `Your QuickProList subscription for ${input.businessName} is active.`,
    subscriptionDisclosureText(),
    'Cancel:',
    cancelSubscriptionMailto(input.businessName, input.accountEmail),
  ]
  if (input.dashboardUrl) {
    lines.push(`Track views and clicks: ${input.dashboardUrl}`)
  }
  return lines.join('\n')
}

export function subscriptionRenewalBody(input: {
  businessName: string
  accountEmail: string
  renewalDate: string
}): string {
  const price = formatSubscriptionPrice()
  return [
    `Your QuickProList subscription for ${input.businessName} renews on ${input.renewalDate}.`,
    `${price}/month. The plan renews automatically every month until you cancel.`,
    SUBSCRIPTION_CANCEL_SENTENCE,
    'Cancel:',
    cancelSubscriptionMailto(input.businessName, input.accountEmail),
  ].join('\n')
}
