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

export const GMAIL_TEST_SUBJECT_TEMPLATE = 'Preview your {city} listing'

export const GMAIL_TEST_BODY_TEMPLATE = `{businessName} already shows up when homeowners near {city} look for {categoryPhrase}.

I'm with QuickProList, writing from ${GMAIL_TEST_FROM}. This is your listing preview. No card, no invoice unless you choose to continue:

{enrollUrl}

After the preview, staying listed is $29.99/month.

Reply "no" or "unsubscribe" and I won't email again.

{postalAddress}`

export function buildGmailTestSubject(city: string): string {
  const label = formatCityLabel(city.trim() || 'your area')
  const specific = GMAIL_TEST_SUBJECT_TEMPLATE.replaceAll('{city}', label)
  if (countWords(specific) >= 3 && countWords(specific) <= 7 && !/\p{Extended_Pictographic}/u.test(specific)) {
    return specific
  }
  return 'Your listing preview'
}

export function renderGmailTestEmail(input: {
  businessName: string
  city: string
  category: string
  enrollUrl: string
  postalAddress?: string | null
}): { subject: string; text: string; wordCount: number } {
  const city = formatCityLabel(input.city)
  const categoryPhrase = formatCategorySearchPhrase(input.category)
  const postal = input.postalAddress?.trim() || POSTAL_ADDRESS_PLACEHOLDER
  const text = GMAIL_TEST_BODY_TEMPLATE.replaceAll('{businessName}', input.businessName.trim())
    .replaceAll('{city}', city)
    .replaceAll('{categoryPhrase}', categoryPhrase)
    .replaceAll('{enrollUrl}', input.enrollUrl.trim())
    .replaceAll('{postalAddress}', postal)
  return { subject: buildGmailTestSubject(input.city), text, wordCount: countWords(text) }
}
