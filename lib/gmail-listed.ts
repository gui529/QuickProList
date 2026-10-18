import { normalizeEmail } from './suppressions'

/**
 * A prospect is already on QuickProList when any one of these matches a
 * curated listing. Any match is enough, so we don't offer a second preview.
 *
 * 1. Email, trimmed and lowercased.
 * 2. Phone, digits only, with a leading US country code 1 dropped when the
 *    rest is 10 digits. Compared only when both sides have a number.
 * 3. Business name plus city. The name is lowercased, "&" becomes "and",
 *    and other punctuation becomes space. The city is the lowercased text
 *    before the first comma, same as normalizeCity in lib/kv.ts.
 */
export interface ListedIdentity {
  email?: string | null
  phone?: string | null
  name: string
  city: string
}

export function normalizeListingPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  return digits
}

export function normalizeListingName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function normalizeListingCity(city: string): string {
  return city.trim().toLowerCase().split(',')[0].trim()
}

export function isAlreadyListed(prospect: ListedIdentity, listings: ListedIdentity[]): boolean {
  const email = prospect.email?.trim() ? normalizeEmail(prospect.email) : null
  const phone = normalizeListingPhone(prospect.phone)
  const name = normalizeListingName(prospect.name)
  const city = normalizeListingCity(prospect.city)
  return listings.some((listing) => {
    const listingEmail = listing.email?.trim() ? normalizeEmail(listing.email) : null
    if (email && listingEmail && email === listingEmail) return true
    const listingPhone = normalizeListingPhone(listing.phone)
    if (phone && listingPhone && phone === listingPhone) return true
    return (
      Boolean(name && city) &&
      normalizeListingName(listing.name) === name &&
      normalizeListingCity(listing.city) === city
    )
  })
}

export async function loadListedIdentities(): Promise<ListedIdentity[]> {
  const { isDatabaseConfigured, query } = await import('./db')
  if (!isDatabaseConfigured()) return []
  const rows = await query<{
    name: string
    phone: string | null
    contact_email: string | null
    cities: string[] | null
  }>('SELECT name, phone, contact_email, cities FROM curated_businesses')
  const listed: ListedIdentity[] = []
  for (const row of rows) {
    const cities = row.cities?.length ? row.cities : ['']
    for (const city of cities) {
      listed.push({
        name: row.name,
        phone: row.phone,
        email: row.contact_email,
        city,
      })
    }
  }
  return listed
}
