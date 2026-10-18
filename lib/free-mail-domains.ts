/**
 * Consumer and ISP mail. One shared list for batch ordering and suppression.
 * An opt-out on one of these domains never covers any other address.
 */
const FREE_MAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'rocketmail.com',
  'aol.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'comcast.net',
  'att.net',
  'sbcglobal.net',
  'bellsouth.net',
  'verizon.net',
  'charter.net',
  'cox.net',
  'proton.me',
  'protonmail.com',
  'pm.me',
])

/** Country-code variants such as yahoo.co.uk and hotmail.co.uk. */
const FREE_MAIL_BRANDS = new Set([
  'gmail',
  'googlemail',
  'yahoo',
  'ymail',
  'rocketmail',
  'outlook',
  'hotmail',
  'live',
  'aol',
])

export function emailDomain(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf('@')
  if (at < 1 || at === normalized.length - 1) return null
  return normalized.slice(at + 1)
}

export function isFreeMailDomain(domain: string): boolean {
  const host = domain.trim().toLowerCase().replace(/^www\./, '')
  if (!host) return false
  if (FREE_MAIL_DOMAINS.has(host)) return true
  return host.split('.').some((label) => FREE_MAIL_BRANDS.has(label))
}
