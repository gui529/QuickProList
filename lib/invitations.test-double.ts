// Test-only in-memory double for lib/invitations.ts.
//
// Mirrors the exported function signatures of lib/invitations.ts, backed by
// a plain in-memory array instead of Supabase, so tests can exercise
// enrollment-invitation logic (expiry, cancellation, idempotency, multi-city
// enrollment, etc.) without live Supabase credentials.
//
// IMPORTANT: this is a test double only. Never import it from `app/` or
// from non-test files under `lib/` — see BACKLOG.md QPL-001.
import type { EnrollmentInvitation, CreateInvitationInput, CreateTrialInvitationInput } from './invitations'

// Inlined copy of lib/invitations.ts's isInvitationExpired. This used to be
// `export { isInvitationExpired } from './invitations'`, but under
// `vi.mock('./invitations', () => import('./invitations.test-double'))`,
// every import of the `'./invitations'` specifier — including this
// re-export from inside the test double itself — gets redirected back to
// this same test double, producing a circular self-import that deadlocks
// vitest instead of throwing (npm test would hang indefinitely). Keeping an
// inline copy of this pure/no-I/O helper breaks that cycle. Keep this in
// sync with lib/invitations.ts if the real implementation changes.
export function isInvitationExpired(invitation: EnrollmentInvitation): boolean {
  if (invitation.status === 'expired') return true
  if (invitation.status !== 'pending') return false
  return new Date(invitation.expires_at).getTime() < Date.now()
}

let invitations: EnrollmentInvitation[] = []
let idCounter = 0
let tokenCounter = 0

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/** Test-only helper: clear all in-memory state between tests. */
export function __reset(): void {
  invitations = []
  idCounter = 0
  tokenCounter = 0
}

/** Test-only helper: seed an invitation directly with arbitrary overrides. */
export function __seed(overrides: Partial<EnrollmentInvitation> = {}): EnrollmentInvitation {
  const now = new Date()
  const full: EnrollmentInvitation = {
    id: overrides.id ?? `invitation-${++idCounter}`,
    token: overrides.token ?? `token-${++tokenCounter}`,
    business_name: overrides.business_name ?? 'Test Business',
    yelp_id: overrides.yelp_id ?? null,
    yelp_data: overrides.yelp_data ?? null,
    category: overrides.category ?? 'general',
    cities: overrides.cities ?? [],
    monthly_price: overrides.monthly_price ?? 0,
    status: overrides.status ?? 'pending',
    stripe_session_id: overrides.stripe_session_id ?? null,
    stripe_subscription_id: overrides.stripe_subscription_id ?? null,
    curated_business_id: overrides.curated_business_id ?? null,
    created_at: overrides.created_at ?? now.toISOString(),
    expires_at: overrides.expires_at ?? new Date(now.getTime() + THIRTY_DAYS_MS).toISOString(),
    canceled_at: overrides.canceled_at ?? null,
    trial_ends_at: overrides.trial_ends_at ?? null,
  }
  invitations.push(full)
  return full
}

/** Test-only helper: inspect all invitations currently in the store. */
export function __all(): EnrollmentInvitation[] {
  return [...invitations]
}

export async function createInvitation(input: CreateInvitationInput): Promise<string> {
  const now = new Date()
  const token = `token-${++tokenCounter}`
  invitations.push({
    id: `invitation-${++idCounter}`,
    token,
    business_name: input.businessName,
    yelp_id: input.yelpId ?? null,
    yelp_data: (input.yelpData as Record<string, unknown>) ?? null,
    category: input.category,
    cities: input.cities,
    monthly_price: input.monthlyPrice,
    status: 'pending',
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: null,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + THIRTY_DAYS_MS).toISOString(),
    canceled_at: null,
    trial_ends_at: null,
  })
  return token
}

export async function getInvitationByToken(token: string): Promise<EnrollmentInvitation | null> {
  return invitations.find((inv) => inv.token === token) ?? null
}

export async function markInvitationPaid(
  token: string,
  sessionId: string,
  subscriptionId: string,
  curatedBusinessId: string
): Promise<void> {
  const inv = invitations.find((i) => i.token === token)
  if (!inv) throw new Error('Invitation not found')
  inv.status = 'paid'
  inv.stripe_session_id = sessionId
  inv.stripe_subscription_id = subscriptionId
  inv.curated_business_id = curatedBusinessId
}

export async function listInvitations(): Promise<EnrollmentInvitation[]> {
  return [...invitations].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export async function listPaidInvitations(): Promise<EnrollmentInvitation[]> {
  return invitations
    .filter((i) => i.status === 'paid' || i.status === 'canceled')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function getInvitationById(id: string): Promise<EnrollmentInvitation | null> {
  return invitations.find((i) => i.id === id) ?? null
}

export async function getInvitationBySubscriptionId(
  subscriptionId: string
): Promise<EnrollmentInvitation | null> {
  return invitations.find((i) => i.stripe_subscription_id === subscriptionId) ?? null
}

export async function createTrialInvitation(input: CreateTrialInvitationInput): Promise<void> {
  const now = new Date()
  invitations.push({
    id: `invitation-${++idCounter}`,
    token: `token-${++tokenCounter}`,
    business_name: input.businessName,
    yelp_id: input.yelpId ?? null,
    yelp_data: (input.yelpData as Record<string, unknown>) ?? null,
    category: input.category,
    cities: input.cities,
    monthly_price: 0,
    status: 'trial',
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: input.curatedBusinessId,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + THIRTY_DAYS_MS).toISOString(),
    canceled_at: null,
    trial_ends_at: input.trialEndsAt,
  })
}

export async function deleteInvitation(id: string): Promise<void> {
  invitations = invitations.filter((i) => i.id !== id)
}

export async function markInvitationCanceled(id: string): Promise<void> {
  const inv = invitations.find((i) => i.id === id)
  if (!inv) throw new Error('Invitation not found')
  inv.status = 'canceled'
  inv.canceled_at = new Date().toISOString()
}
