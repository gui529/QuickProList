import { createHmac, timingSafeEqual } from 'node:crypto'
import { normalizeEmail } from './suppressions'

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET
  if (!s) throw new Error('UNSUBSCRIBE_SECRET (or CRON_SECRET) not configured')
  return s
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createUnsubscribeToken(email: string): string {
  const payload = Buffer.from(normalizeEmail(email)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** Returns the normalized email if the token is authentic, else null. */
export function verifyUnsubscribeToken(token: string): string | null {
  const [payload, sig, extra] = token.split('.')
  if (!payload || !sig || extra !== undefined) return null

  const expected = Buffer.from(sign(payload))
  const actual = Buffer.from(sig)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  const email = Buffer.from(payload, 'base64url').toString()
  return email.includes('@') ? email : null
}

export function buildUnsubscribeUrl(email: string): string {
  const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')
  return `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(createUnsubscribeToken(email))}`
}
