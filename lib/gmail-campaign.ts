import { formatCategorySearchPhrase, formatCityLabel } from './display'

/** Gmail test sends leave from this mailbox. Sending itself is outside the repo. */
export const GMAIL_TEST_FROM = 'gui.quickprolist@gmail.com'
export const GMAIL_TEST_DAILY_CAP = 5
export const GMAIL_TEST_TARGET = 20
export const POSTAL_ADDRESS_PLACEHOLDER = '{postalAddress}'
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

export const GMAIL_TEST_SUBJECT_TEMPLATE = 'your {city} listing preview'

export const GMAIL_TEST_BODY_TEMPLATE = `Hi,

You probably get plenty of marketing pitches, so I'll keep this short.

I set up a preview listing for {businessName} on QuickProList, a local directory of {categoryPhrase} around {city}.

It's not a lead service: homeowners call you directly. No per-lead fees, no bidding against other pros.

Your preview is ready to look over (two minutes):
{enrollUrl}

The 30-day preview is free, no card needed. After that it's a flat $29.99/month if you stay.

Guilherme, QuickProList

This is a promotional email from QuickProList. Reply "no" and I won't email again.
{postalAddress}`

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

export function buildGmailTestSubject(city: string): string {
  const label = formatCityLabel(city.trim() || 'your area')
  const specific = GMAIL_TEST_SUBJECT_TEMPLATE.replaceAll('{city}', label)
  // A lowercase first letter is intentional. Only length and emoji can reject it.
  if (countWords(specific) >= 3 && countWords(specific) <= 7 && !/\p{Extended_Pictographic}/u.test(specific)) {
    return specific
  }
  return 'your listing preview'
}

export function renderGmailTestEmail(input: {
  businessName: string
  city: string
  category: string
  enrollUrl: string
  postalAddress?: string | null
}): { subject: string; text: string; wordCount: number } {
  const city = formatCityLabel(input.city)
  const categoryPhrase = categoryPhraseInSentence(input.category)
  const postal = input.postalAddress?.trim() || POSTAL_ADDRESS_PLACEHOLDER
  const text = GMAIL_TEST_BODY_TEMPLATE.replaceAll('{businessName}', input.businessName.trim())
    .replaceAll('{city}', city)
    .replaceAll('{categoryPhrase}', categoryPhrase)
    .replaceAll('{enrollUrl}', input.enrollUrl.trim())
    .replaceAll('{postalAddress}', postal)
  return { subject: buildGmailTestSubject(input.city), text, wordCount: countWords(text) }
}
