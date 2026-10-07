import { isDatabaseConfigured, query } from './db'

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

/** `value` must already be normalized: lowercase email, or E.164 phone. */
export async function isSuppressed(channel: SuppressionChannel, value: string): Promise<boolean> {
  requireDatabase()
  const rows = await query<{ value: string }>(
    'SELECT value FROM suppressions WHERE channel = $1 AND value = $2',
    [channel, value]
  )
  return rows.length > 0
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

export async function removeSuppression(channel: SuppressionChannel, value: string): Promise<void> {
  requireDatabase()
  await query('DELETE FROM suppressions WHERE channel = $1 AND value = $2', [channel, value])
}
