import type { Business } from './business'
import { isDatabaseConfigured, query } from './db'
import { isUuid } from './is-uuid'
import { SUBSCRIPTION_MONTHLY_PRICE_USD } from './subscription-terms'

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
  contact_email?: string | null
  subscription_consent_at?: string | null
  subscription_consent_text?: string | null
  renewal_notice_period_end?: string | null
  subscription_confirmation_sent_at?: string | null
  renewal_confirmation_invoice_id?: string | null
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
  contactEmail?: string | null
}

export async function createInvitation(input: CreateInvitationInput): Promise<string> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  const rows = await query<{ token: string }>(
    `INSERT INTO enrollment_invitations (
       business_name, yelp_id, yelp_data, category, cities, monthly_price, curated_business_id, contact_email
     ) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8)
     RETURNING token`,
    [
      input.businessName,
      input.yelpId || null,
      input.yelpData ? JSON.stringify(input.yelpData) : null,
      input.category,
      input.cities,
      input.monthlyPrice,
      input.curatedBusinessId || null,
      input.contactEmail?.trim() || null,
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

// `enrollment_invitations.token` is a uuid column (migrations/001). Postgres
// rejects any other string with `invalid input syntax for type uuid` (22P02).

/** Postgres `invalid_text_representation` — raised when a non-UUID is compared to a uuid column. */
function isInvalidUuidInput(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  if ('code' in err && (err as { code?: unknown }).code === '22P02') return true
  const message = 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
  return message.includes('invalid input syntax for type uuid')
}

export async function getInvitationByToken(token: string): Promise<EnrollmentInvitation | null> {
  // Never send a non-UUID to the uuid column. The cast throws, and an uncaught
  // throw on /enroll/[token] becomes the generic 500 error page.
  if (!isUuid(token)) return null
  if (!isDatabaseConfigured()) return null
  try {
    const rows = await query<EnrollmentInvitation>(
      'SELECT * FROM enrollment_invitations WHERE token = $1',
      [token]
    )
    return rows[0] ? asInvitation(rows[0]) : null
  } catch (err) {
    if (isInvalidUuidInput(err)) return null
    throw err
  }
}

export async function markInvitationTrial(
  token: string,
  curatedBusinessId: string,
  trialEndsAt: string
): Promise<void> {
  if (!isUuid(token)) throw new Error('invalid invitation token')
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query(
    `UPDATE enrollment_invitations
     SET status = 'trial', curated_business_id = $2, trial_ends_at = $3
     WHERE token = $1`,
    [token, curatedBusinessId, trialEndsAt]
  )
}

export async function recordSubscriptionConsent(
  token: string,
  consentText: string,
  consentedAt: string
): Promise<void> {
  if (!isUuid(token)) throw new Error('invalid invitation token')
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query(
    `UPDATE enrollment_invitations
     SET subscription_consent_at = $2, subscription_consent_text = $3
     WHERE token = $1`,
    [token, consentedAt, consentText]
  )
}

export async function markSubscriptionConfirmationSent(id: string): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query(
    `UPDATE enrollment_invitations
     SET subscription_confirmation_sent_at = $2
     WHERE id = $1`,
    [id, new Date().toISOString()]
  )
}

export async function markRenewalNoticeSent(id: string, periodEnd: string): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query(
    `UPDATE enrollment_invitations
     SET renewal_notice_period_end = $2
     WHERE id = $1`,
    [id, periodEnd]
  )
}

export async function markRenewalConfirmationSent(id: string, invoiceId: string): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query(
    `UPDATE enrollment_invitations
     SET renewal_confirmation_invoice_id = $2
     WHERE id = $1`,
    [id, invoiceId]
  )
}

/** Curated ids with a live trial or paid listing-program enrollment. */
export async function listingProgramBusinessIds(ids: string[]): Promise<Set<string>> {
  const uuids = [...new Set(ids.filter((id) => isUuid(id)))]
  if (uuids.length === 0 || !isDatabaseConfigured()) return new Set()
  const rows = await query<{ curated_business_id: string }>(
    `SELECT DISTINCT curated_business_id
     FROM enrollment_invitations
     WHERE curated_business_id = ANY($1::uuid[])
       AND status IN ('trial', 'paid')`,
    [uuids]
  )
  return new Set(rows.map((row) => row.curated_business_id).filter(Boolean))
}

export async function markInvitationPaid(
  token: string,
  sessionId: string,
  subscriptionId: string,
  curatedBusinessId: string
): Promise<void> {
  if (!isUuid(token)) throw new Error('invalid invitation token')
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
     ) VALUES ($1,$2,$3::jsonb,$4,$5,$6,'trial',$7,$8)`,
    [
      input.businessName,
      input.yelpId || null,
      input.yelpData ? JSON.stringify(input.yelpData) : null,
      input.category,
      input.cities,
      SUBSCRIPTION_MONTHLY_PRICE_USD,
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
