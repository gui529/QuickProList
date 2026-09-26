import { createClient } from '@supabase/supabase-js'
import { listInvitations, type EnrollmentInvitation } from './invitations'

export interface BusinessReport {
  id: string
  name: string
  source: 'yelp' | 'manual'
  category: string
  cities: string[]
  pinned_at: string
  is_trial: boolean
  trial_ends_at: string | null
  pro_site_enabled: boolean
  current_status: 'paid' | 'trial' | 'expired-trial' | 'pending' | 'canceled' | 'none'
  actions_count: number
  invitations: EnrollmentInvitation[]
}

interface CuratedRow {
  id: string
  name: string
  source: 'yelp' | 'manual'
  category: string
  cities: string[]
  created_at: string
  is_trial: boolean
  trial_ends_at: string | null
  pro_site_enabled: boolean
}

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export interface DeriveStatusRow {
  is_trial: boolean
  trial_ends_at: string | null
}

/**
 * Derive a business's current subscription/enrollment status from its
 * `curated_businesses` row (just the two trial fields are needed) and its
 * linked `enrollment_invitations`. Exported (not just used internally by
 * `getBusinessReports`) so other status displays — e.g. the business-facing
 * dashboard at `/dashboard/[token]` — can reuse the exact same logic instead
 * of re-deriving it.
 */
export function deriveStatus(
  row: DeriveStatusRow,
  invitations: EnrollmentInvitation[]
): BusinessReport['current_status'] {
  const now = new Date()
  if (invitations.some((i) => i.status === 'paid')) return 'paid'
  const trialInvActive = invitations.some(
    (i) => i.status === 'trial' && (!i.trial_ends_at || new Date(i.trial_ends_at) > now)
  )
  if (trialInvActive) return 'trial'
  if (row.is_trial) {
    if (!row.trial_ends_at || new Date(row.trial_ends_at) > now) return 'trial'
    return 'expired-trial'
  }
  const trialInvExpired = invitations.some(
    (i) => i.status === 'trial' && i.trial_ends_at && new Date(i.trial_ends_at) <= now
  )
  if (trialInvExpired) return 'expired-trial'
  if (invitations.some((i) => i.status === 'pending')) return 'pending'
  if (invitations.some((i) => i.status === 'canceled')) return 'canceled'
  return 'none'
}

export async function getBusinessReports(): Promise<BusinessReport[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const [{ data: rows, error }, allInvitations] = await Promise.all([
    supabase
      .from('curated_businesses')
      .select('id, name, source, category, cities, created_at, is_trial, trial_ends_at, pro_site_enabled')
      .order('created_at', { ascending: false }),
    listInvitations(),
  ])

  if (error || !rows) return []

  const byBusinessId = new Map<string, EnrollmentInvitation[]>()
  for (const inv of allInvitations) {
    if (!inv.curated_business_id) continue
    const arr = byBusinessId.get(inv.curated_business_id) ?? []
    arr.push(inv)
    byBusinessId.set(inv.curated_business_id, arr)
  }

  return (rows as CuratedRow[]).map((row) => {
    const invitations = (byBusinessId.get(row.id) ?? []).sort(
      (a, z) => new Date(a.created_at).getTime() - new Date(z.created_at).getTime()
    )
    return {
      id: row.id,
      name: row.name,
      source: row.source,
      category: row.category,
      cities: row.cities ?? [],
      pinned_at: row.created_at,
      is_trial: row.is_trial ?? false,
      trial_ends_at: row.trial_ends_at ?? null,
      pro_site_enabled: row.pro_site_enabled ?? false,
      current_status: deriveStatus(row, invitations),
      actions_count: invitations.length,
      invitations,
    }
  })
}
