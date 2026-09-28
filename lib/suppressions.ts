import { createClient } from '@supabase/supabase-js'

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

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/** `value` must already be normalized: lowercase email, or E.164 phone. */
export async function isSuppressed(channel: SuppressionChannel, value: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('suppressions')
    .select('value')
    .eq('channel', channel)
    .eq('value', value)
    .maybeSingle()

  // Fail closed: if the list can't be read, the caller must not send.
  if (error) throw new Error('Failed to check suppression list')
  return !!data
}

export async function addSuppression(
  channel: SuppressionChannel,
  value: string,
  reason: string
): Promise<void> {
  const { error } = await getSupabase()
    .from('suppressions')
    .upsert({ channel, value, reason }, { onConflict: 'channel,value' })
  if (error) throw new Error('Failed to add suppression')
}

export async function removeSuppression(channel: SuppressionChannel, value: string): Promise<void> {
  const { error } = await getSupabase()
    .from('suppressions')
    .delete()
    .eq('channel', channel)
    .eq('value', value)
  if (error) throw new Error('Failed to remove suppression')
}
