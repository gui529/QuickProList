import {
  emailDomain,
  findPriorContact,
  type GmailSentEntry,
} from './campaign-contact-history'
import type { SentRegistryEntry } from './campaign-sent-registry'
import { formatCategoryLabel, formatCityLabel } from './display'
import {
  ENROLL_URL_PLACEHOLDER,
  GMAIL_TEST_BODY_TEMPLATE,
  GMAIL_TEST_DAILY_CAP,
  GMAIL_TEST_FROM,
  GMAIL_TEST_SUBJECT_TEMPLATE,
  GMAIL_TEST_TARGET,
  isRoleAddress,
  renderGmailTestEmail,
} from './gmail-campaign'
import type { ProspectRecord } from './campaign-prospect-registry'
import { normalizeEmail } from './suppressions'

export type ExclusionReason = 'bounced' | 'suppressed' | 'complained' | 'already_emailed' | 'no_mx' | 'no_email' | 'skipped'

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
}): GmailTestBatch {
  const sendReady: GmailBatchRow[] = []
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
    if (status === 'bounced') reason = 'bounced'
    else if (status === 'suppressed') reason = 'suppressed'
    else if (status === 'complained') reason = 'complained'
    else if (findPriorContact(email, prospect.businessName, { resend: input.resend, gmail: input.gmail })) {
      reason = 'already_emailed'
    } else if (mx === false) reason = 'no_mx'
    else if (prospect.status === 'skip') reason = 'skipped'

    if (reason) {
      excluded.push({ ...base, reason })
      continue
    }

    const rendered = renderGmailTestEmail({
      businessName: prospect.businessName,
      city: prospect.city,
      category: prospect.category,
      enrollUrl: ENROLL_URL_PLACEHOLDER,
      postalAddress: input.postalAddress,
    })
    const row: GmailBatchRow = {
      ...base,
      enrollUrl: ENROLL_URL_PLACEHOLDER,
      enrollUrlStatus: 'placeholder',
      subject: rendered.subject,
      text: rendered.text,
      wordCount: rendered.wordCount,
    }
    if (roleAddress || mx === null) flagged.push(row)
    else sendReady.push(row)
  }

  const blockers = [
    'Board stays PAUSED. Do not send until the owner unpauses.',
    'Enroll URLs are placeholders. DATABASE_URL was not available here, so invitations were not created. Run scripts/campaign-gmail-enroll-urls.ts when the database is configured.',
    'Postal address is the {postalAddress} placeholder (GitHub issue #18). Do not invent one.',
    `Send-ready count is ${sendReady.length} of about ${GMAIL_TEST_TARGET}. Add prospects with scripts/campaign-add-prospect.ts.`,
    'Catch-all mailboxes were not probed. Role addresses (info@, help@, customerservice@) are flagged and kept out of sendReady.',
  ]

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
    flagged,
    excluded,
    needsEmail,
  }
}
