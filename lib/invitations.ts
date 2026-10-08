import type { Business } from './business'
import { isDatabaseConfigured, query } from './db'

export interface EnrollmentInvitation {
  id: string
  token: string
  business_name: string
  yelp_id: string | null
  yelp_data: Record<string, unknown> | null
  category: string
  cities: string[]
  monthly_price: number
  status: 'pending' | 'paid' | 'expired' | 'canceled' | 'trial'
  stripe_session_id: string | null
  stripe_subscription_id: string | null
  curated_business_id: string | null
  created_at: string
  expires_at: string
  canceled_at: string | null
  trial_ends_at: string | null
}

function asInvitation(row: EnrollmentInvitation): EnrollmentInvitation {
  return { ...row, monthly_price: Number(row.monthly_price) }
}

export interface CreateInvitationInput {
  businessName: string
  category: string
  cities: string[]
  monthlyPrice: number
  yelpId?: string
  yelpData?: Partial<Business>
  /**
   * When enrolling a business that is already a `curated_businesses` row
   * (e.g. converting an existing manually-pinned pro to a paid
   * subscription), the id of that pre-existing row. Carried through to the
   * webhook so `checkout.session.completed` updates this row in place
   * instead of inserting a second, bare duplicate — mirroring how the
   * Yelp-sourced path already dedupes via `upsert` on `yelp_id`.
   */
  curatedBusinessId?: string
}

export async function createInvitation(input: CreateInvitationInput): Promise<string> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  const rows = await query<{ token: string }>(
    `INSERT INTO enrollment_invitations (
       business_name, yelp_id, yelp_data, category, cities, monthly_price, curated_business_id
     ) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7)
     RETURNING token`,
    [
      input.businessName,
      input.yelpId || null,
      input.yelpData ? JSON.stringify(input.yelpData) : null,
      input.category,
      input.cities,
      input.monthlyPrice,
      input.curatedBusinessId || null,
    ]
  )
  if (!rows[0]) throw new Error('Failed to create invitation')
  return rows[0].token
}

/**
 * True if an invitation should be treated as expired: either its status is
 * already `'expired'`, or it's still `'pending'` and its `expires_at`
 * timestamp has passed. Other terminal statuses (`paid`, `canceled`,
 * `trial`) are never considered expired here — `trial` uses its own
 * `trial_ends_at` field, and `paid`/`canceled` invitations have already
 * moved past the enrollment window this check guards.
 */
export function isInvitationExpired(invitation: EnrollmentInvitation): boolean {
  if (invitation.status === 'expired') return true
  if (invitation.status !== 'pending') return false
  return new Date(invitation.expires_at).getTime() < Date.now()
}

export async function getInvitationByToken(token: string): Promise<EnrollmentInvitation | null> {
  if (!isDatabaseConfigured()) return null
  const rows = await query<EnrollmentInvitation>(
    'SELECT * FROM enrollment_invitations WHERE token = $1',
    [token]
  )
  return rows[0] ? asInvitation(rows[0]) : null
}

export async function markInvitationTrial(
  token: string,
  curatedBusinessId: string,
  trialEndsAt: string
): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query(
    `UPDATE enrollment_invitations
     SET status = 'trial', curated_business_id = $2, trial_ends_at = $3
     WHERE token = $1`,
    [token, curatedBusinessId, trialEndsAt]
  )
}

export async function markInvitationPaid(
  token: string,
  sessionId: string,
  subscriptionId: string,
  curatedBusinessId: string
): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query(
    `UPDATE enrollment_invitations
     SET status = 'paid', stripe_session_id = $2, stripe_subscription_id = $3, curated_business_id = $4
     WHERE token = $1`,
    [token, sessionId, subscriptionId, curatedBusinessId]
  )
}

export async function listInvitations(): Promise<EnrollmentInvitation[]> {
  if (!isDatabaseConfigured()) return []
  const rows = await query<EnrollmentInvitation>(
    'SELECT * FROM enrollment_invitations ORDER BY created_at DESC'
  )
  return rows.map(asInvitation)
}

export async function listPaidInvitations(): Promise<EnrollmentInvitation[]> {
  if (!isDatabaseConfigured()) return []
  const rows = await query<EnrollmentInvitation>(
    `SELECT * FROM enrollment_invitations
     WHERE status IN ('paid', 'canceled')
     ORDER BY created_at DESC`
  )
  return rows.map(asInvitation)
}

export async function getInvitationBySubscriptionId(
  subscriptionId: string
): Promise<EnrollmentInvitation | null> {
  if (!isDatabaseConfigured()) return null
  const rows = await query<EnrollmentInvitation>(
    'SELECT * FROM enrollment_invitations WHERE stripe_subscription_id = $1',
    [subscriptionId]
  )
  return rows[0] ? asInvitation(rows[0]) : null
}

/**
 * Look up the most recent `paid` invitation linked to a curated business —
 * used by the Stripe Billing Portal route to find the `stripe_subscription_id`
 * for a business identified only by its dashboard token. Returns `null` when
 * there's no paid invitation on record (e.g. a trial or never-subscribed
 * business), including when the database isn't configured.
 */
export async function getInvitationByCuratedBusinessId(
  curatedBusinessId: string
): Promise<EnrollmentInvitation | null> {
  if (!isDatabaseConfigured()) return null
  const rows = await query<EnrollmentInvitation>(
    `SELECT * FROM enrollment_invitations
     WHERE curated_business_id = $1 AND status = 'paid'
     ORDER BY created_at DESC
     LIMIT 1`,
    [curatedBusinessId]
  )
  return rows[0] ? asInvitation(rows[0]) : null
}

export async function getInvitationById(id: string): Promise<EnrollmentInvitation | null> {
  if (!isDatabaseConfigured()) return null
  const rows = await query<EnrollmentInvitation>(
    'SELECT * FROM enrollment_invitations WHERE id = $1',
    [id]
  )
  return rows[0] ? asInvitation(rows[0]) : null
}

export interface CreateTrialInvitationInput {
  businessName: string
  category: string
  cities: string[]
  trialEndsAt: string | null
  curatedBusinessId: string
  yelpId?: string
  yelpData?: Partial<Business>
}

export async function createTrialInvitation(input: CreateTrialInvitationInput): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query(
    `INSERT INTO enrollment_invitations (
       business_name, yelp_id, yelp_data, category, cities, monthly_price, status,
       curated_business_id, trial_ends_at
     ) VALUES ($1,$2,$3::jsonb,$4,$5,0,'trial',$6,$7)`,
    [
      input.businessName,
      input.yelpId || null,
      input.yelpData ? JSON.stringify(input.yelpData) : null,
      input.category,
      input.cities,
      input.curatedBusinessId,
      input.trialEndsAt,
    ]
  )
}

export async function deleteInvitation(id: string): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query('DELETE FROM enrollment_invitations WHERE id = $1', [id])
}

export async function markInvitationCanceled(id: string): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query(
    `UPDATE enrollment_invitations SET status = 'canceled', canceled_at = $2 WHERE id = $1`,
    [id, new Date().toISOString()]
  )
}
