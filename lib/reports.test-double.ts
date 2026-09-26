// Test-only in-memory double for lib/reports.ts.
//
// Mirrors the exported function signature of lib/reports.ts, composing the
// in-memory stores from lib/kv.test-double.ts and
// lib/invitations.test-double.ts instead of hitting Supabase.
//
// IMPORTANT: this is a test double only. Never import it from `app/` or
// from non-test files under `lib/` — see BACKLOG.md QPL-001.
import type { EnrollmentInvitation } from './invitations'
import type { BusinessReport } from './reports'
import { __all as allCuratedRows } from './kv.test-double'
import { listInvitations } from './invitations.test-double'

function deriveStatus(
  row: ReturnType<typeof allCuratedRows>[number],
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
  const rows = allCuratedRows().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const allInvitations = await listInvitations()

  const byBusinessId = new Map<string, EnrollmentInvitation[]>()
  for (const inv of allInvitations) {
    if (!inv.curated_business_id) continue
    const arr = byBusinessId.get(inv.curated_business_id) ?? []
    arr.push(inv)
    byBusinessId.set(inv.curated_business_id, arr)
  }

  return rows.map((row) => {
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
