import { getCuratedById } from './kv'
import { listInvitations } from './invitations'
import { deriveStatus } from './reports'

export type PublicListingStatus = 'active' | 'trial' | 'expired-trial' | 'unknown'

export interface PublicListingStatusResult {
  status: PublicListingStatus
  businessName?: string
  trialEndsAt?: string | null
  subscribeToken?: string | null
}

/** Coarse status for a pro's own listing (used for post-trial homepage banner). */
export async function getPublicListingStatus(
  curatedBusinessId: string
): Promise<PublicListingStatusResult> {
  const business = await getCuratedById(curatedBusinessId)
  if (!business) return { status: 'unknown' }

  const invitations = (await listInvitations()).filter(
    (i) => i.curated_business_id === curatedBusinessId
  )
  const derived = deriveStatus(
    { is_trial: business.isTrial ?? false, trial_ends_at: business.trialEndsAt ?? null },
    invitations
  )

  const subscribeToken =
    invitations.find((i) => i.status === 'trial' || i.status === 'pending')?.token ?? null

  if (derived === 'paid') return { status: 'active', businessName: business.name, subscribeToken }
  if (derived === 'trial') {
    return {
      status: 'trial',
      businessName: business.name,
      trialEndsAt: business.trialEndsAt ?? null,
      subscribeToken,
    }
  }
  if (derived === 'expired-trial') {
    return { status: 'expired-trial', businessName: business.name, subscribeToken }
  }
  return { status: 'unknown', businessName: business.name }
}
