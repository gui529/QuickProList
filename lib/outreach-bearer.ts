import type { NextRequest } from 'next/server'

/** Shared secret for the local `outreach/` CLI — never expose to the browser. */
export function getOutreachSecret(): string | undefined {
  return process.env.CAMPAIGN_OUTREACH_SECRET?.trim()
}

export function isValidOutreachBearer(req: NextRequest): boolean {
  const secret = getOutreachSecret()
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}
