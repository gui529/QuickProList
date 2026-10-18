import { sendCommercialNotice } from './email'
import { getCuratedById } from './kv'
import {
  getInvitationBySubscriptionId,
  markRenewalNoticeSent,
  type EnrollmentInvitation,
} from './invitations'
import { formatPreviewEndDate } from './preview-date'
import {
  shouldSendRenewalNotice,
  subscriptionConfirmationBody,
  subscriptionConfirmationSubject,
  subscriptionRenewalBody,
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

async function deliverNotice(to: string, businessName: string, subject: string, body: string): Promise<void> {
  await sendCommercialNotice(to, subject, body, { enforceSuppression: false })
}

export async function sendSubscriptionConfirmation(input: {
  businessName: string
  accountEmail: string
  dashboardUrl?: string | null
}): Promise<void> {
  const body = subscriptionConfirmationBody(input)
  await deliverNotice(input.accountEmail, input.businessName, subscriptionConfirmationSubject(), body)
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
  await deliverNotice(email, invitation.business_name, subscriptionRenewalSubject(renewalDate), body)
  await markRenewalNoticeSent(invitation.id, periodEnd)
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
