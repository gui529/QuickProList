import { campaignPostalAddress, sendEmail, usableCampaignPostalAddress } from './email'
import { getCuratedById } from './kv'
import {
  getInvitationBySubscriptionId,
  markRenewalConfirmationSent,
  markRenewalNoticeSent,
  type EnrollmentInvitation,
} from './invitations'
import { formatPreviewEndDate } from './preview-date'
import {
  formatChargedAmount,
  shouldSendRenewalNotice,
  subscriptionConfirmationBody,
  subscriptionConfirmationSubject,
  subscriptionRenewalBody,
  subscriptionRenewalConfirmationBody,
  subscriptionRenewalConfirmationSubject,
  subscriptionRenewalSubject,
} from './subscription-terms'

export interface UpcomingInvoiceShape {
  period_end?: number | null
  customer_email?: string | null
  subscription?: string | { id?: string | null } | null
  parent?: {
    subscription_details?: {
      subscription?: string | { id?: string | null } | null
    } | null
  } | null
  lines?: {
    data?: Array<{ period?: { start?: number | null; end?: number | null } | null } | null> | null
  } | null
}

export interface PaidInvoiceShape extends UpcomingInvoiceShape {
  id?: string | null
  billing_reason?: string | null
  amount_paid?: number | null
  created?: number | null
  status_transitions?: { paid_at?: number | null } | null
}

function subscriptionIdFrom(value: string | { id?: string | null } | null | undefined): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  return value.id ?? null
}

export function upcomingSubscriptionId(invoice: UpcomingInvoiceShape): string | null {
  return (
    subscriptionIdFrom(invoice.parent?.subscription_details?.subscription) ??
    subscriptionIdFrom(invoice.subscription)
  )
}

export function upcomingRenewalMs(invoice: UpcomingInvoiceShape): number | null {
  // `period_end` is when the current period closes and Stripe creates the
  // renewal invoice. A line item's `period.end` is the end of the upcoming
  // service period (about a month later) and would miss the lead window.
  const line = invoice.lines?.data?.[0]?.period
  const seconds = invoice.period_end ?? line?.start
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null
  return seconds * 1000
}

/**
 * Transactional billing send. No ad line, no unsubscribe link, and no
 * List-Unsubscribe headers — those stay on `sendCommercialNotice` for
 * campaign and cold email. A postal line is added only when one is configured.
 */
async function deliverBillingNotice(
  to: string,
  businessName: string,
  subject: string,
  body: string
): Promise<void> {
  const postal = usableCampaignPostalAddress(campaignPostalAddress())
  const text = postal ? `${body}\n${postal}` : body
  await sendEmail(to, businessName, text, { kind: 'transactional', subject })
}

export async function sendSubscriptionConfirmation(input: {
  businessName: string
  accountEmail: string
  nextChargeDate: string
}): Promise<void> {
  const body = subscriptionConfirmationBody(input)
  await deliverBillingNotice(
    input.accountEmail,
    input.businessName,
    subscriptionConfirmationSubject(),
    body
  )
}

export async function sendUpcomingRenewalNotice(
  invoice: UpcomingInvoiceShape,
  nowMs = Date.now()
): Promise<'sent' | 'skipped'> {
  const subscriptionId = upcomingSubscriptionId(invoice)
  const renewalMs = upcomingRenewalMs(invoice)
  if (!subscriptionId || renewalMs === null || !shouldSendRenewalNotice(renewalMs, nowMs)) {
    return 'skipped'
  }

  const invitation = await getInvitationBySubscriptionId(subscriptionId)
  if (!invitation) return 'skipped'

  const periodEnd = new Date(renewalMs).toISOString()
  if (invitation.renewal_notice_period_end === periodEnd) return 'skipped'

  const email = await renewalRecipient(invitation, invoice.customer_email)
  if (!email) return 'skipped'

  const renewalDate = formatPreviewEndDate(periodEnd)
  const body = subscriptionRenewalBody({
    businessName: invitation.business_name,
    accountEmail: email,
    renewalDate,
  })
  await deliverBillingNotice(email, invitation.business_name, subscriptionRenewalSubject(renewalDate), body)
  await markRenewalNoticeSent(invitation.id, periodEnd)
  return 'sent'
}

/**
 * Renewal receipt. `subscription_create` is the first invoice and already
 * gets the subscription confirmation, so only `subscription_cycle` is sent.
 */
export async function sendRenewalConfirmation(
  invoice: PaidInvoiceShape
): Promise<'sent' | 'skipped'> {
  if (invoice.billing_reason !== 'subscription_cycle') return 'skipped'
  const invoiceId = invoice.id?.trim()
  const subscriptionId = upcomingSubscriptionId(invoice)
  if (!invoiceId || !subscriptionId) return 'skipped'
  if (typeof invoice.amount_paid !== 'number' || !Number.isFinite(invoice.amount_paid)) return 'skipped'

  const chargeSec = invoice.status_transitions?.paid_at ?? invoice.created
  const nextSec = invoice.lines?.data?.[0]?.period?.end
  if (typeof chargeSec !== 'number' || typeof nextSec !== 'number') return 'skipped'

  const invitation = await getInvitationBySubscriptionId(subscriptionId)
  if (!invitation) return 'skipped'
  if (invitation.renewal_confirmation_invoice_id === invoiceId) return 'skipped'

  const email = await renewalRecipient(invitation, invoice.customer_email)
  if (!email) return 'skipped'

  const body = subscriptionRenewalConfirmationBody({
    businessName: invitation.business_name,
    accountEmail: email,
    amount: formatChargedAmount(invoice.amount_paid),
    chargeDate: formatPreviewEndDate(new Date(chargeSec * 1000).toISOString()),
    nextChargeDate: formatPreviewEndDate(new Date(nextSec * 1000).toISOString()),
  })
  await deliverBillingNotice(
    email,
    invitation.business_name,
    subscriptionRenewalConfirmationSubject(),
    body
  )
  await markRenewalConfirmationSent(invitation.id, invoiceId)
  return 'sent'
}

async function renewalRecipient(
  invitation: EnrollmentInvitation,
  customerEmail?: string | null
): Promise<string | null> {
  if (invitation.curated_business_id) {
    const business = await getCuratedById(invitation.curated_business_id)
    const stored = business?.contactEmail?.trim()
    if (stored) return stored
  }
  const fromInvoice = customerEmail?.trim()
  return fromInvoice || invitation.contact_email?.trim() || null
}
