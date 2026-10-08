/** Fixed admin email for the dev-only QA sign-in. Not an admin on production. */
export const QA_ADMIN_EMAIL = 'qa@quickprolist.com'

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
