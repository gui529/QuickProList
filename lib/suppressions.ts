import { isDatabaseConfigured, query } from './db'
import { emailDomain, isFreeMailDomain } from './free-mail-domains'

export type SuppressionChannel = 'sms' | 'email'

export class SuppressedError extends Error {
  constructor(
    public channel: SuppressionChannel,
    public value: string
  ) {
    super(`Recipient is on the do-not-contact list (${channel})`)
    this.name = 'SuppressedError'
  }
}

function requireDatabase() {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/**
 * True when `email` is on the do-not-contact list. An exact address always
 * matches. On a company domain, any suppressed address on that same domain
 * matches too. Free-mail and ISP domains match one address at a time.
 */
export function emailCoveredBySuppression(email: string, suppressedValues: Iterable<string>): boolean {
  const normalized = normalizeEmail(email)
  const values = [...suppressedValues].map((value) => normalizeEmail(value)).filter(Boolean)
  if (values.includes(normalized)) return true
  const domain = emailDomain(normalized)
  if (!domain || isFreeMailDomain(domain)) return false
  return values.some((value) => emailDomain(value) === domain)
}

/** `value` must already be normalized: lowercase email, or E.164 phone. */
export async function isSuppressed(channel: SuppressionChannel, value: string): Promise<boolean> {
  requireDatabase()
  const rows = await query<{ value: string }>(
    'SELECT value FROM suppressions WHERE channel = $1 AND value = $2',
    [channel, value]
  )
  if (rows.length > 0) return true
  if (channel !== 'email') return false
  const domain = emailDomain(value)
  if (!domain || isFreeMailDomain(domain)) return false
  const domainRows = await query<{ value: string }>(
    `SELECT value FROM suppressions
     WHERE channel = 'email' AND lower(split_part(value, '@', 2)) = $1
     LIMIT 1`,
    [domain]
  )
  return domainRows.length > 0
}

export async function addSuppression(
  channel: SuppressionChannel,
  value: string,
  reason: string
): Promise<void> {
  requireDatabase()
  await query(
    `INSERT INTO suppressions (channel, value, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (channel, value) DO UPDATE SET reason = EXCLUDED.reason`,
    [channel, value, reason]
  )
}

export async function listSuppressedValues(channel: SuppressionChannel): Promise<string[]> {
  requireDatabase()
  const rows = await query<{ value: string }>('SELECT value FROM suppressions WHERE channel = $1', [channel])
  return rows.map((row) => row.value)
}

export async function removeSuppression(channel: SuppressionChannel, value: string): Promise<void> {
  requireDatabase()
  await query('DELETE FROM suppressions WHERE channel = $1 AND value = $2', [channel, value])
}
