import type { Business } from './yelp'

/** Fields that must never appear in a response a signed-out visitor can read. */
const PRIVATE_FIELDS = [
  'dashboardToken',
  'contactEmail',
  'isTrial',
  'trialEndsAt',
  'reviewUrl',
] as const

export type PublicBusiness = Omit<Business, (typeof PRIVATE_FIELDS)[number]>

/** Keep only the fields public pages render. */
export function toPublicBusiness(business: Business): PublicBusiness {
  const copy = { ...business }
  for (const field of PRIVATE_FIELDS) {
    delete copy[field]
  }
  return copy
}
