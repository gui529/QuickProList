import { usableCampaignPostalAddress } from './email'
import {
  GMAIL_AD_LINE,
  GMAIL_MISSING_POSTAL_REASON,
  GMAIL_OPT_OUT_LINE,
  GMAIL_TEST_DAILY_CAP,
  assertNoUnfilledGmailPlaceholder,
  gmailFromHeader,
  isClaimedMonthlyPrice,
} from './gmail-campaign'
import { isAllowedProspectSource } from './prospect-sources'
import { emailCoveredBySuppression } from './suppressions'
import { formatSubscriptionPrice } from './subscription-terms'

export const FOLLOW_UP_DAYS = [4, 10, 18] as const
export type FollowUpDay = (typeof FOLLOW_UP_DAYS)[number]

export type FollowUpSkipReason =
  | 'replied'
  | 'opted_out'
  | 'suppressed'
  | 'enrolled'
  | 'expired_link'
  | 'disallowed_source'

export interface FollowUpInvitation {
  status: string
  expiresAt: string
}

/** Due follow-ups are scheduled before new contacts, both inside the daily cap. */
export function planGmailDay<T>(
  dueFollowUps: T[],
  newContacts: T[],
  cap = GMAIL_TEST_DAILY_CAP
): { scheduled: T[]; deferred: T[] } {
  const scheduled = [...dueFollowUps, ...newContacts].slice(0, cap)
  const deferred = [...dueFollowUps, ...newContacts].slice(cap)
  return { scheduled, deferred }
}

export function gmailFooter(postalAddress: string): string {
  return `${GMAIL_AD_LINE} ${GMAIL_OPT_OUT_LINE} ${postalAddress}`
}

/**
 * Next unsent step whose day has arrived. Earlier steps stay ahead of later
 * ones, so a missed day 4 is still sent before day 10.
 */
export function nextFollowUpStep(sentAt: Date, now: Date, sentSteps: readonly number[]): FollowUpDay | null {
  for (const day of FOLLOW_UP_DAYS) {
    if (sentSteps.includes(day)) continue
    const dueAt = sentAt.getTime() + day * 24 * 60 * 60 * 1000
    if (now.getTime() >= dueAt) return day
    return null
  }
  return null
}

export function followUpSkipReason(input: {
  replied?: boolean
  optedOut?: boolean
  suppressed?: boolean
  /** Checked with `suppressedEmails` through the shared domain helper. */
  email?: string | null
  suppressedEmails?: Iterable<string>
  /** Prospect `source`. Missing, Yelp, and unknown values skip. See docs/prospect-sources.md. */
  source?: string | null
  invitation: FollowUpInvitation | null
  now: Date
}): FollowUpSkipReason | null {
  if (input.optedOut) return 'opted_out'
  const covered =
    input.suppressed === true ||
    (input.email != null &&
      input.suppressedEmails != null &&
      emailCoveredBySuppression(input.email, input.suppressedEmails))
  if (covered) return 'suppressed'
  if (!isAllowedProspectSource(input.source)) return 'disallowed_source'
  if (input.replied) return 'replied'
  const invitation = input.invitation
  if (!invitation) return 'expired_link'
  if (invitation.status === 'trial' || invitation.status === 'paid') return 'enrolled'
  if (invitation.status !== 'pending') return 'expired_link'
  if (new Date(invitation.expiresAt).getTime() <= input.now.getTime()) return 'expired_link'
  return null
}

export interface GmailFollowUp {
  step: FollowUpDay
  subject: string
  text: string
  from: string
  inReplyTo: string | null
  references: string | null
  threadId: string | null
}

export function renderGmailFollowUp(input: {
  step: FollowUpDay
  businessName: string
  enrollUrl: string
  subject: string
  trialDays: number
  price: string
  postalAddress?: string | null
  inReplyTo?: string | null
  threadId?: string | null
}): GmailFollowUp {
  const postal = usableCampaignPostalAddress(input.postalAddress)
  if (!postal) throw new Error('Refusing to render a Gmail follow-up without a postal address')
  if (!isClaimedMonthlyPrice(input.price)) {
    throw new Error('Refusing to render a Gmail follow-up when the price is not 29.99')
  }
  const businessName = input.businessName.trim()
  const enrollUrl = input.enrollUrl.trim()
  const price = formatSubscriptionPrice()
  const bodies: Record<FollowUpDay, string> = {
    4: `One detail I left out: if you start the preview and it's not for you, do nothing. It comes down by itself after ${input.trialDays} days and you're never billed. Same link: ${enrollUrl}`,
    10: `It probably sounds like one more Angi. It isn't. No leads sold, no bidding. Flat ${price}/month after the free ${input.trialDays} days, only if you want it. Would it be a bad idea to take a look? ${enrollUrl}`,
    18: `I'll stop here so I'm not cluttering your inbox. If you ever want the ${businessName} listing, just reply and I'll send a fresh link. Thanks for reading.`,
  }
  const inReplyTo = input.inReplyTo?.trim() || null
  const text = `${bodies[input.step]}\n\n${gmailFooter(postal)}`
  assertNoUnfilledGmailPlaceholder(text)
  return {
    step: input.step,
    subject: input.subject,
    text,
    from: gmailFromHeader(),
    inReplyTo,
    references: inReplyTo,
    threadId: input.threadId?.trim() || null,
  }
}

export type FollowUpHoldReason = typeof GMAIL_MISSING_POSTAL_REASON | 'price_mismatch'

/** Held, not sendable, for a missing postal address or a price other than 29.99. */
export function prepareGmailFollowUp(
  input: Parameters<typeof renderGmailFollowUp>[0]
): { status: 'held'; reason: FollowUpHoldReason } | { status: 'ready'; message: GmailFollowUp } {
  if (!isClaimedMonthlyPrice(input.price)) {
    return { status: 'held', reason: 'price_mismatch' }
  }
  if (!usableCampaignPostalAddress(input.postalAddress)) {
    return { status: 'held', reason: GMAIL_MISSING_POSTAL_REASON }
  }
  return { status: 'ready', message: renderGmailFollowUp(input) }
}
