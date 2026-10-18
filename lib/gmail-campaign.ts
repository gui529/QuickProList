import { CATEGORIES, normalizeCategory } from './categories'
import { formatCategorySearchPhrase, formatCityLabel } from './display'
import { parseEnrollPreviewTrialDays } from './enroll-preview-days'
import { usableCampaignPostalAddress } from './email'
import { emailCoveredBySuppression } from './suppressions'
import {
  formatSubscriptionPrice,
  isConfiguredSubscriptionPrice,
  SUBSCRIPTION_MONTHLY_PRICE_USD,
} from './subscription-terms'

/** Gmail test sends leave from this mailbox. Sending itself is outside the repo. */
export const GMAIL_TEST_FROM = 'gui.quickprolist@gmail.com'
export const GMAIL_TEST_DAILY_CAP = 5
export const GMAIL_TEST_TARGET = 20
export const POSTAL_ADDRESS_PLACEHOLDER = '{postalAddress}'
/** Same hold the first Gmail email uses when CAMPAIGN_POSTAL_ADDRESS is unset. */
export const GMAIL_MISSING_POSTAL_REASON = 'missing_postal' as const

const UNFILLED_GMAIL_PLACEHOLDER = /\{[A-Za-z][A-Za-z0-9]*\}/

/** A rendered Gmail body is not sendable while a `{token}` is still in it. */
export function assertNoUnfilledGmailPlaceholder(text: string): void {
  const token = text.match(UNFILLED_GMAIL_PLACEHOLDER)?.[0]
  if (token) throw new Error(`Refusing to render a Gmail email with unfilled ${token}`)
}
export const ENROLL_URL_PLACEHOLDER = 'https://www.quickprolist.com/enroll/PENDING_INVITATION'

const ROLE_LOCAL_PARTS = new Set([
  'info',
  'hello',
  'contact',
  'contacts',
  'sales',
  'support',
  'admin',
  'office',
  'help',
  'customerservice',
  'customer.service',
  'service',
  'services',
  'inquiries',
  'enquiry',
  'enquiries',
  'mail',
  'email',
  'team',
  'jobs',
  'careers',
  'billing',
  'accounts',
  'noreply',
  'no-reply',
  'webmaster',
  'postmaster',
  'marketing',
  'hr',
  'receptionist',
])

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function isRoleAddress(email: string): boolean {
  const local = email.trim().toLowerCase().split('@')[0] ?? ''
  const bare = local.split('+')[0] ?? ''
  return ROLE_LOCAL_PARTS.has(bare)
}

export const GMAIL_FROM_DISPLAY_NAME = 'Guilherme at QuickProList'
/** Active first-touch subject. The A/B pair below is no longer sent. */
export const GMAIL_ACTIVE_SUBJECT_TEMPLATE = 'your {city} listing preview'
/** Retired from active sends. assignGmailSubject still records A or B. */
export const GMAIL_SUBJECT_A_TEMPLATE = '{businessName} preview'
export const GMAIL_SUBJECT_B = 'not a lead service'
export const GMAIL_AD_LINE = 'This email is an ad.'
export const GMAIL_OPT_OUT_LINE = 'Not interested? Reply "no" or "stop" and I won\'t email you again.'

export function gmailFromHeader(): string {
  return `"${GMAIL_FROM_DISPLAY_NAME}" <${GMAIL_TEST_FROM}>`
}

export const GMAIL_TEST_BODY_TEMPLATE = `You probably get plenty of marketing pitches, so I'll keep this short. I set up a preview listing for {businessName} on QuickProList, a local directory where homeowners find pros and {contactVerb} them directly. No per-lead fees, no bidding, no middleman. Your preview is ready to look over (two minutes): {enrollUrl}
If you click start, it's live in search for {trialDays} days, free, no card. After that it comes down on its own unless you choose {price}/month, flat.
Guilherme, QuickProList
${GMAIL_AD_LINE} ${GMAIL_OPT_OUT_LINE} {postalAddress}`

/** Lowercase mid-sentence. All-caps acronyms such as HVAC stay uppercase. */
export function categoryPhraseInSentence(category: string): string {
  return formatCategorySearchPhrase(category)
    .split(/(\s+)/)
    .map((part) => (/^[A-Z0-9]{2,}$/.test(part) ? part : part.toLowerCase()))
    .join('')
}

export function gmailProspectSlug(businessName: string): string {
  const slug = businessName
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'prospect'
}

/** `?ref=gmail-<slug>` for click attribution. The enroll route reads the token from the path. */
export function withGmailAttributionRef(enrollUrl: string, businessName: string): string {
  const url = new URL(enrollUrl)
  url.searchParams.set('ref', `gmail-${gmailProspectSlug(businessName)}`)
  return url.toString()
}

export function isEnrollPlaceholder(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    const base = new URL(ENROLL_URL_PLACEHOLDER)
    return parsed.origin === base.origin && parsed.pathname === base.pathname
  } catch {
    return url.startsWith(ENROLL_URL_PLACEHOLDER)
  }
}

/** Swap the placeholder token for a real one and keep an existing ref query param. */
export function enrollUrlWithToken(siteUrl: string, token: string, previousUrl: string): string {
  const next = new URL(`${siteUrl.replace(/\/$/, '')}/enroll/${token}`)
  try {
    const ref = new URL(previousUrl).searchParams.get('ref')
    if (ref) next.searchParams.set('ref', ref)
  } catch {
    // A bare token URL is still a working enroll link.
  }
  return next.toString()
}

/** Known trade only. Unknown categories are not guessed. */
export function gmailCategoryPhrase(category: string): string | null {
  const key = normalizeCategory(category || '')
  const known = CATEGORIES.find((item) => item.value === key)
  if (!known) return null
  const phrase = categoryPhraseInSentence(known.value).trim()
  return phrase || null
}

export function gmailActiveSubject(city: string): string {
  return GMAIL_ACTIVE_SUBJECT_TEMPLATE.replaceAll('{city}', formatCityLabel(city))
}

export function gmailSubjectA(businessName: string): string {
  return GMAIL_SUBJECT_A_TEMPLATE.replaceAll('{businessName}', businessName.trim())
}

/**
 * A is "{businessName} preview" and B is "not a lead service".
 * The choice is a stable hash of the email, except A is never used when it
 * would be longer than 4 words.
 */
export function assignGmailSubject(
  businessName: string,
  email: string
): { variant: 'A' | 'B'; subject: string } {
  const subjectA = gmailSubjectA(businessName)
  if (countWords(subjectA) > 4) return { variant: 'B', subject: GMAIL_SUBJECT_B }
  let hash = 0
  const key = email.trim().toLowerCase()
  for (let i = 0; i < key.length; i += 1) hash = (Math.imul(hash, 33) + key.charCodeAt(i)) >>> 0
  if (hash % 2 === 0) return { variant: 'A', subject: subjectA }
  return { variant: 'B', subject: GMAIL_SUBJECT_B }
}

export const CLAIMED_MONTHLY_PRICE_CENTS = 2999

/** True only for 29.99. Missing and other amounts are not the claim in the copy. */
export function isClaimedMonthlyPrice(price: number | string | null | undefined): boolean {
  return isConfiguredSubscriptionPrice(price)
}

export function renderGmailTestEmail(input: {
  businessName: string
  email?: string
  city: string
  category: string
  enrollUrl: string
  postalAddress?: string | null
  trialDays?: number
  monthlyPrice?: number | string | null
  hasPhone?: boolean
}): {
  subject: string
  subjectVariant: 'A' | 'B'
  text: string
  wordCount: number
  from: string
} {
  const postal = usableCampaignPostalAddress(input.postalAddress)
  if (!postal) throw new Error('Refusing to render a Gmail email without a postal address')
  const claimedPrice = input.monthlyPrice ?? SUBSCRIPTION_MONTHLY_PRICE_USD
  if (!isClaimedMonthlyPrice(claimedPrice)) {
    throw new Error('Refusing to render a Gmail email when the price is not 29.99')
  }
  const city = formatCityLabel(input.city)
  const categoryPhrase = gmailCategoryPhrase(input.category) ?? ''
  const trialDays = input.trialDays ?? parseEnrollPreviewTrialDays(process.env.ENROLL_PREVIEW_TRIAL_DAYS)
  const price = formatSubscriptionPrice()
  const contactVerb = input.hasPhone === false ? 'contact' : 'call'
  const assigned = assignGmailSubject(input.businessName, input.email ?? input.businessName)
  const text = GMAIL_TEST_BODY_TEMPLATE.replaceAll('{businessName}', input.businessName.trim())
    .replaceAll('{city}', city)
    .replaceAll('{categoryPhrase}', categoryPhrase)
    .replaceAll('{enrollUrl}', input.enrollUrl.trim())
    .replaceAll('{postalAddress}', postal)
    .replaceAll('{trialDays}', String(trialDays))
    .replaceAll('{price}', price)
    .replaceAll('{contactVerb}', contactVerb)
  assertNoUnfilledGmailPlaceholder(text)
  return {
    subject: gmailActiveSubject(input.city),
    subjectVariant: assigned.variant,
    text,
    wordCount: countWords(text),
    from: gmailFromHeader(),
  }
}

/**
 * Reply opt-outs for cold mail sent from GMAIL_TEST_FROM.
 *
 * Those messages have no unsubscribe link. A reply is the only opt-out.
 * CAN-SPAM requires that request to be honored within 10 business days, so
 * `scripts/campaign-scan-gmail-replies.ts` must be run at least every 5
 * business days. It only reads the inbox (HTTP GET) or a fixture file. It
 * never sends.
 *
 * Matching (err toward suppressing):
 * - Whole words, any case, any surrounding whitespace or punctuation:
 *   no, stop, unsubscribe / unsubscribed / unsubscribing, remove / removed.
 * - Phrases that clearly mean stop, including when they are not those words:
 *   not interested, take me off, don't email me, do not email me,
 *   leave me alone, opt out, stop emailing, no thanks.
 * - Quoted original text is ignored, so our own opt-out line is not treated
 *   as the prospect's request.
 * - Safe idioms are not opt-outs: "no problem", "no worries", "no rush",
 *   "no big deal", "no biggie", "no offense", "no sweat".
 *   "no problem, call me" stays eligible.
 * - Any other use of those words is an opt-out, including ambiguous ones
 *   ("stop by the shop", "please remove the typo"). A missed opt-out is
 *   worse than dropping one cold-test prospect.
 * - If a safe idiom and a real opt-out both appear, suppress.
 * - Words that merely contain the letters ("know", "another", "cannot")
 *   are not opt-outs.
 * Opt-outs are written to the shared `suppressions` table (`reply_opt_out`),
 * the same list `sendEmail` checks before a Resend marketing send.
 */
export const REPLY_OPT_OUT_REASON = 'reply_opt_out'
export const REPLY_OPT_OUT_BUSINESS_DAY_SLA = 10
/** Wider than the legal window so a late scan still records the reply. */
export const REPLY_OPT_OUT_LOOKBACK_CALENDAR_DAYS = 30

const REPLY_OPT_OUT_SAFE_PHRASES = [
  'no problem',
  'no worries',
  'no rush',
  'no big deal',
  'no biggie',
  'no offense',
  'no sweat',
] as const

const REPLY_OPT_OUT_PHRASES = [
  'not interested',
  'take me off',
  'do not email',
  'dont email',
  'leave me alone',
  'opt out',
  'stop emailing',
  'no thanks',
] as const

const REPLY_OPT_OUT_WORD =
  /(?:^|[^a-z0-9])(no|stop|unsubscribe|unsubscribed|unsubscribing|remove|removed)(?![a-z0-9])/i

export interface InboundGmailReply {
  fromEmail: string
  body: string
  receivedAt?: string
}

export function subtractBusinessDays(from: Date, businessDays: number): Date {
  if (businessDays < 0) throw new Error('businessDays must be >= 0')
  const cursor = new Date(from.getTime())
  let left = businessDays
  while (left > 0) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) left -= 1
  }
  return cursor
}

export function replyScanSince(now: Date): Date {
  const since = new Date(now.getTime())
  since.setUTCDate(since.getUTCDate() - REPLY_OPT_OUT_LOOKBACK_CALENDAR_DAYS)
  return since
}

export function isWithinReplyOptOutSla(receivedAt: Date, now: Date): boolean {
  return receivedAt.getTime() >= subtractBusinessDays(now, REPLY_OPT_OUT_BUSINESS_DAY_SLA).getTime()
}

/** Drop quoted originals so our own "Reply no" line is not the prospect's words. */
export function prospectReplyText(body: string): string {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const kept: string[] = []
  for (const line of lines) {
    if (/^\s*>/.test(line)) break
    if (/^\s*On .+wrote:\s*$/i.test(line)) break
    if (/^\s*-{5,}\s*original message\s*-{5,}\s*$/i.test(line)) break
    if (/^\s*-{5,}\s*forwarded message\s*-{5,}\s*$/i.test(line)) break
    kept.push(line)
  }
  return kept.join('\n').trim()
}

function collapseReplyWords(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function replyIsOptOut(body: string): boolean {
  let text = ` ${collapseReplyWords(prospectReplyText(body))} `
  for (const phrase of REPLY_OPT_OUT_SAFE_PHRASES) {
    text = text.replaceAll(` ${phrase} `, ' ')
  }
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (REPLY_OPT_OUT_PHRASES.some((phrase) => ` ${collapsed} `.includes(` ${phrase} `))) return true
  return new RegExp(REPLY_OPT_OUT_WORD.source, 'i').test(collapsed)
}

export function emailFromHeader(from: string): string | null {
  const angle = from.match(/<([^<>\s]+@[^<>\s]+)>/)
  const raw = (angle?.[1] ?? from).trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return null
  const email = raw.toLowerCase()
  if (email === GMAIL_TEST_FROM) return null
  return email
}

/**
 * Send-time suppression check for a Gmail message. The batch file can be
 * stale; this uses the same helper as batch building and follow-ups.
 */
export function gmailSendBlockedBySuppression(email: string, suppressedEmails: Iterable<string>): boolean {
  return emailCoveredBySuppression(email, suppressedEmails)
}

export interface ReplyOptOutWriter {
  addSuppression(channel: 'email', value: string, reason: string): Promise<void>
}

export async function recordReplyOptOuts(
  replies: InboundGmailReply[],
  writer: ReplyOptOutWriter
): Promise<{ suppressed: string[]; ignored: string[] }> {
  const suppressed: string[] = []
  const ignored: string[] = []
  const seen = new Set<string>()
  for (const reply of replies) {
    const email = emailFromHeader(reply.fromEmail) ?? emailFromHeader(`<${reply.fromEmail}>`)
    if (!email) {
      ignored.push(reply.fromEmail)
      continue
    }
    if (!replyIsOptOut(reply.body)) {
      ignored.push(email)
      continue
    }
    if (seen.has(email)) continue
    seen.add(email)
    await writer.addSuppression('email', email, REPLY_OPT_OUT_REASON)
    suppressed.push(email)
  }
  return { suppressed, ignored }
}

interface GmailPayload {
  mimeType?: string
  headers?: { name: string; value: string }[]
  body?: { data?: string }
  parts?: GmailPayload[]
}

interface GmailApiMessage {
  id?: string
  internalDate?: string
  snippet?: string
  payload?: GmailPayload
}

function decodeBase64Url(data: string): string {
  const pad = data.length % 4 === 0 ? '' : '='.repeat(4 - (data.length % 4))
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/') + pad
  return Buffer.from(b64, 'base64').toString('utf8')
}

function collectBodies(part: GmailPayload | undefined, plain: string[], html: string[]): void {
  if (!part) return
  if (part.body?.data) {
    const text = decodeBase64Url(part.body.data)
    if (part.mimeType === 'text/plain') plain.push(text)
    else if (part.mimeType === 'text/html') html.push(text.replace(/<[^>]+>/g, ' '))
  }
  for (const child of part.parts ?? []) collectBodies(child, plain, html)
}

export function replyFromGmailMessage(message: GmailApiMessage): InboundGmailReply | null {
  const from = message.payload?.headers?.find((header) => header.name.toLowerCase() === 'from')?.value
  const email = from ? emailFromHeader(from) : null
  if (!email) return null
  const plain: string[] = []
  const html: string[] = []
  collectBodies(message.payload, plain, html)
  const body = plain.join('\n').trim() || html.join('\n').trim() || message.snippet || ''
  const receivedAt = message.internalDate ? new Date(Number(message.internalDate)).toISOString() : undefined
  return { fromEmail: email, body, receivedAt }
}

/**
 * Read inbox replies. GET only — this function has no send URL and rejects
 * any non-GET the caller might have wired into `fetchImpl`.
 */
export async function readGmailInboxReplies(options: {
  accessToken: string
  since: Date
  fetchImpl?: typeof fetch
}): Promise<InboundGmailReply[]> {
  const fetchImpl = options.fetchImpl ?? fetch
  const replies: InboundGmailReply[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({
      q: `in:inbox newer_than:${REPLY_OPT_OUT_LOOKBACK_CALENDAR_DAYS}d -from:${GMAIL_TEST_FROM}`,
      maxResults: '100',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`
    const list = (await gmailGetJson(fetchImpl, listUrl, options.accessToken)) as {
      messages?: { id: string }[]
      nextPageToken?: string
    }
    for (const item of list.messages ?? []) {
      const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=full`
      const message = (await gmailGetJson(fetchImpl, messageUrl, options.accessToken)) as GmailApiMessage
      const reply = replyFromGmailMessage(message)
      if (!reply) continue
      if (reply.receivedAt && new Date(reply.receivedAt).getTime() < options.since.getTime()) continue
      replies.push(reply)
    }
    if (!list.nextPageToken) break
    pageToken = list.nextPageToken
  }
  return replies
}

async function gmailGetJson(fetchImpl: typeof fetch, url: string, accessToken: string): Promise<unknown> {
  if (url.includes('/messages/send') || url.includes('/drafts')) {
    throw new Error('Refusing to call a Gmail send endpoint')
  }
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error(`Gmail read failed (${response.status})`)
  return response.json()
}
