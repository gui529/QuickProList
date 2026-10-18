import { timingSafeEqual } from 'node:crypto'

/** Fixed admin email for the dev-only QA sign-in. Not an admin on production. */
export const QA_ADMIN_EMAIL = 'qa@quickprolist.com'

/** Attempts per IP per minute for the dev-only QA credential check. */
export const QA_LOGIN_MAX_ATTEMPTS = 5

/**
 * Compares two strings without throwing when the lengths differ.
 * A length mismatch still runs a same-buffer compare so the crypto call is not skipped.
 */
export function constantTimeEqual(given: string, expected: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    timingSafeEqual(a, a)
    return false
  }
  return timingSafeEqual(a, b)
}

export function isProductionHost(host: string | null | undefined): boolean {
  const hostname = (host ?? '').split(':')[0].trim().toLowerCase()
  return hostname === 'www.quickprolist.com' || hostname === 'quickprolist.com'
}

/** Env gate. Production builds and production hosts never qualify. */
export function qaLoginAllowed(host: string | null | undefined): boolean {
  if (!process.env.QA_ADMIN_SECRET) return false
  if (process.env.VERCEL_ENV === 'production') return false
  if (isProductionHost(host)) return false
  return true
}
