import {
  emailDomain,
  findPriorContact,
  type GmailSentEntry,
} from './campaign-contact-history'
import type { SentRegistryEntry } from './campaign-sent-registry'
import { formatCategoryLabel, formatCityLabel } from './display'
import { usableCampaignPostalAddress } from './email'
import {
  ENROLL_URL_PLACEHOLDER,
  GMAIL_TEST_BODY_TEMPLATE,
  GMAIL_TEST_DAILY_CAP,
  GMAIL_TEST_FROM,
  GMAIL_TEST_SUBJECT_TEMPLATE,
  GMAIL_TEST_TARGET,
  isClaimedMonthlyPrice,
  isRoleAddress,
  renderGmailTestEmail,
  withGmailAttributionRef,
} from './gmail-campaign'
import type { ProspectRecord } from './campaign-prospect-registry'
import { isAlreadyListed, type ListedIdentity } from './gmail-listed'
import { normalizeEmail } from './suppressions'

export type ExclusionReason =
  | 'bounced'
  | 'suppressed'
  | 'complained'
  | 'already_emailed'
  | 'no_mx'
  | 'no_email'
  | 'skipped'
  | 'price_mismatch'
  | 'already_listed'

export interface GmailBatchRow {
  business: string
  trade: string
  city: string
  email: string | null
  sourceUrl: string | null
  enrollUrl: string | null
  enrollUrlStatus: 'placeholder' | 'live' | 'none'
  roleAddress: boolean
  /** SMTP catch-all was not probed; role mailboxes are flagged instead. */
  catchAll: 'not_probed'
  mx: boolean | null
  resendStatus: string | null
  reason?: ExclusionReason
  subject?: string
  text?: string
  wordCount?: number
}

export interface GmailTestBatch {
  version: 1
  channel: 'gmail'
  from: string
  board: 'PAUSED'
  capPerDay: number
  targetSize: number
  readyToSend: boolean
  generatedAt: string
  ownerBlockers: string[]
  notes: string[]
  template: { subject: string; text: string }
  sendReady: GmailBatchRow[]
  /** Passed every other check, but CAMPAIGN_POSTAL_ADDRESS is unset. */
  held: GmailBatchRow[]
  flagged: GmailBatchRow[]
  excluded: GmailBatchRow[]
  needsEmail: GmailBatchRow[]
}

function sourceUrl(prospect: ProspectRecord): string | null {
  const fromNote = prospect.emailSource?.match(/https?:\/\/\S+/)?.[0]?.replace(/[),.;]+$/, '')
  if (fromNote) return fromNote
  return prospect.websiteUrl?.trim() || null
}

function resendStatusFor(email: string, sent: SentRegistryEntry[]): string | null {
  const hit = sent.find((row) => normalizeEmail(row.email) === normalizeEmail(email))
  return hit?.deliveryStatus ?? (hit ? 'sent_status_unknown' : null)
}

export function buildGmailTestBatch(input: {
  prospects: ProspectRecord[]
  resend: SentRegistryEntry[]
  gmail: GmailSentEntry[]
  /** domain → whether a DNS MX lookup returned at least one record */
  mxByDomain: Record<string, boolean>
  generatedAt?: string
  postalAddress?: string | null
  /** Normalized or not. Matched case-insensitively. */
  suppressedEmails?: string[]
  /**
   * Invitation monthly_price keyed by normalized email.
   * Missing and non-29.99 prices are held with reason price_mismatch and are not sent.
   */
  claimsByEmail?: Record<string, { monthlyPrice: number | string | null; phone?: string | null }>
  /** Curated listings. A prospect matching email, phone, or name+city is excluded. */
  listings?: ListedIdentity[]
  /**
   * When false, the do-not-contact list was not loaded. Nothing is send-ready.
   * Omit when the caller passed `suppressedEmails` (including an empty list).
   */
  suppressionListLoaded?: boolean
}): GmailTestBatch {
  const postal = usableCampaignPostalAddress(input.postalAddress)
  const suppressed = new Set((input.suppressedEmails ?? []).map((email) => normalizeEmail(email)))
  const sendReady: GmailBatchRow[] = []
  const held: GmailBatchRow[] = []
  const flagged: GmailBatchRow[] = []
  const excluded: GmailBatchRow[] = []
  const needsEmail: GmailBatchRow[] = []

  for (const prospect of input.prospects) {
    const email = prospect.email?.trim() ? normalizeEmail(prospect.email) : null
    const domain = email ? emailDomain(email) : null
    const mx = domain ? (input.mxByDomain[domain] ?? null) : null
    const roleAddress = email ? isRoleAddress(email) : false
    const status = email ? resendStatusFor(email, input.resend) : null
    const base: GmailBatchRow = {
      business: prospect.businessName,
      trade: formatCategoryLabel(prospect.category) || prospect.category,
      city: formatCityLabel(prospect.city),
      email,
      sourceUrl: sourceUrl(prospect),
      enrollUrl: null,
      enrollUrlStatus: 'none',
      roleAddress,
      catchAll: 'not_probed',
      mx,
      resendStatus: status,
    }

    if (!email) {
      needsEmail.push({
        ...base,
        reason: prospect.status === 'skip' ? 'skipped' : 'no_email',
      })
      continue
    }

    let reason: ExclusionReason | null = null
    const claim = input.claimsByEmail?.[email]
    const alreadyListed = isAlreadyListed(
      {
        email,
        phone: claim?.phone,
        name: prospect.businessName,
        city: prospect.city,
      },
      input.listings ?? []
    )
    if (status === 'bounced') reason = 'bounced'
    else if (status === 'suppressed' || suppressed.has(email)) reason = 'suppressed'
    else if (alreadyListed) reason = 'already_listed'
    else if (status === 'complained') reason = 'complained'
    else if (findPriorContact(email, prospect.businessName, { resend: input.resend, gmail: input.gmail })) {
      reason = 'already_emailed'
    } else if (mx === false) reason = 'no_mx'
    else if (prospect.status === 'skip') reason = 'skipped'

    if (reason) {
      excluded.push({ ...base, reason })
      continue
    }

    const enrollUrl = withGmailAttributionRef(ENROLL_URL_PLACEHOLDER, prospect.businessName)
    const rendered = renderGmailTestEmail({
      businessName: prospect.businessName,
      city: prospect.city,
      category: prospect.category,
      enrollUrl,
      postalAddress: postal,
    })
    const row: GmailBatchRow = {
      ...base,
      enrollUrl,
      enrollUrlStatus: 'placeholder',
      subject: rendered.subject,
      text: rendered.text,
      wordCount: rendered.wordCount,
    }
    const monthlyPrice = claim ? claim.monthlyPrice : null
    if (!isClaimedMonthlyPrice(monthlyPrice)) {
      held.push({ ...row, reason: 'price_mismatch' })
      continue
    }
    if (roleAddress || mx === null) flagged.push(row)
    else if (!postal) held.push(row)
    else if (input.suppressionListLoaded === false) held.push(row)
    else sendReady.push(row)
  }

  const blockers = [
    'Board stays PAUSED. Do not send until the owner unpauses.',
    'Enroll URLs are placeholders. DATABASE_URL was not available here, so invitations were not created. Run scripts/campaign-gmail-enroll-urls.ts when the database is configured.',
  ]
  if (!postal) {
    blockers.push(
      'Postal address is the {postalAddress} placeholder (GitHub issue #18). Do not invent one. Rows that pass every other check stay in held, not sendReady, until CAMPAIGN_POSTAL_ADDRESS is set.'
    )
  }
  if (input.suppressionListLoaded === false) {
    blockers.push(
      'Email suppression list was not loaded. Rows that passed every other check stay in held, not sendReady, until suppressions are checked.'
    )
  }
  blockers.push(
    `Send-ready count is ${sendReady.length} of about ${GMAIL_TEST_TARGET}. Add prospects with scripts/campaign-add-prospect.ts.`,
    'Catch-all mailboxes were not probed. Role addresses (info@, help@, customerservice@) are flagged and kept out of sendReady.',
    'Addresses on the email suppression list, including reason reply_opt_out, are excluded with reason suppressed.'
  )

  return {
    version: 1,
    channel: 'gmail',
    from: GMAIL_TEST_FROM,
    board: 'PAUSED',
    capPerDay: GMAIL_TEST_DAILY_CAP,
    targetSize: GMAIL_TEST_TARGET,
    readyToSend: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    ownerBlockers: blockers,
    notes: [
      'Cold outreach is not sent through Resend (Resend AUP). The owner assistant sends this batch from Gmail, outside the repo, at most 5 per day.',
      'Dropped addresses include Resend statuses recorded on docs/campaigns/sent-registry.json.',
      'MX values come from DNS lookups at generation time.',
    ],
    template: { subject: GMAIL_TEST_SUBJECT_TEMPLATE, text: GMAIL_TEST_BODY_TEMPLATE },
    sendReady,
    held,
    flagged,
    excluded,
    needsEmail,
  }
}
