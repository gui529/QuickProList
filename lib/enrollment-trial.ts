import type { Business } from './business'
import type { EnrollmentInvitation } from './invitations'
import {
  getInvitationByToken,
  isInvitationExpired,
  listInvitations,
  markInvitationTrial,
} from './invitations'
import {
  addCuratedFromYelp,
  addCuratedManual,
  findCuratedIdByYelpId,
  findLatestManualCuratedId,
  getCuratedById,
  publishCurated,
  setCuratedContactEmail,
  setCuratedTrial,
} from './kv'
import { deriveStatus } from './reports'
import { sendEmail } from './email'
import { isProDashboardEnabled } from './feature-flags'

export class EnrollmentTrialError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'not_found'
      | 'expired'
      | 'already_paid'
      | 'invalid_state'
      | 'preview_not_available',
    readonly status: number
  ) {
    super(message)
    this.name = 'EnrollmentTrialError'
  }
}

/** Days for campaign / enroll self-serve preview (matches marketing copy). */
export function enrollPreviewTrialDays(): number {
  const raw = process.env.ENROLL_PREVIEW_TRIAL_DAYS?.trim()
  if (!raw) return 30
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 30
}

export function previewTrialEndsAt(fromMs = Date.now()): string {
  const days = enrollPreviewTrialDays()
  return new Date(fromMs + days * 24 * 60 * 60 * 1000).toISOString()
}

async function provisionCuratedForInvitation(
  invitation: EnrollmentInvitation,
  trialEndsAt: string
): Promise<string> {
  if (invitation.yelp_id && invitation.yelp_data) {
    const business = invitation.yelp_data as Partial<Business>
    await addCuratedFromYelp(
      {
        id: invitation.yelp_id,
        name: invitation.business_name,
        rating: business.rating ?? null,
        reviewCount: business.reviewCount ?? null,
        phone: business.phone || '',
        address: business.address || '',
        imageUrl: business.imageUrl || '',
        url: business.url || '',
        websiteUrl: business.websiteUrl,
        categories: business.categories || [],
        source: 'yelp',
        yelpId: invitation.yelp_id,
      },
      invitation.category,
      invitation.cities,
      trialEndsAt
    )
    const id = (await findCuratedIdByYelpId(invitation.yelp_id)) || ''
    if (!id) throw new Error('Failed to resolve curated business after Yelp import')
    return id
  }

  await addCuratedManual({
    name: invitation.business_name,
    category: invitation.category,
    cities: invitation.cities,
    trialEndsAt,
  })
  const id = (await findLatestManualCuratedId(invitation.business_name)) || ''
  if (!id) throw new Error('Failed to resolve curated business after manual add')
  return id
}

function resolveContactEmail(
  invitation: EnrollmentInvitation,
  bodyEmail?: string | null
): string | null {
  const fromBody = bodyEmail?.trim()
  if (fromBody) return fromBody
  const fromInvite = invitation.contact_email?.trim()
  if (fromInvite) return fromInvite
  return null
}

async function assertPreviewAllowed(invitation: EnrollmentInvitation): Promise<void> {
  if (invitation.curated_business_id) {
    throw new EnrollmentTrialError(
      'This listing already exists — subscribe to stay on QuickProList.',
      'preview_not_available',
      400
    )
  }

  const rows = await listInvitations()
  for (const inv of rows) {
    if (inv.status !== 'trial' || !inv.curated_business_id) continue
    if (inv.business_name.trim().toLowerCase() !== invitation.business_name.trim().toLowerCase()) {
      continue
    }
    const business = await getCuratedById(inv.curated_business_id)
    if (!business) continue
    const linked = rows.filter((i) => i.curated_business_id === inv.curated_business_id)
    const status = deriveStatus(
      { is_trial: business.isTrial ?? false, trial_ends_at: business.trialEndsAt ?? null },
      linked
    )
    if (status === 'expired-trial') {
      throw new EnrollmentTrialError(
        'This business already used a free preview — subscribe to stay listed.',
        'preview_not_available',
        400
      )
    }
  }
}

export interface ActivateEnrollmentTrialResult {
  curatedBusinessId: string
  dashboardToken: string | null
  trialEndsAt: string
}

/**
 * Self-serve 30-day preview from a pending campaign/enrollment link — no Stripe
 * until the business chooses to subscribe after the preview window.
 */
export async function activateEnrollmentTrial(
  token: string,
  contactEmail?: string | null
): Promise<ActivateEnrollmentTrialResult> {
  const invitation = await getInvitationByToken(token)
  if (!invitation) {
    throw new EnrollmentTrialError('Invitation not found', 'not_found', 404)
  }
  if (isInvitationExpired(invitation)) {
    throw new EnrollmentTrialError('Invitation has expired', 'expired', 410)
  }
  if (invitation.status === 'paid') {
    throw new EnrollmentTrialError('Invitation already paid', 'already_paid', 400)
  }
  if (invitation.status === 'canceled' || invitation.status === 'expired') {
    throw new EnrollmentTrialError('Invitation is no longer active', 'invalid_state', 400)
  }

  if (invitation.status === 'trial' && invitation.curated_business_id) {
    const business = await getCuratedById(invitation.curated_business_id)
    return {
      curatedBusinessId: invitation.curated_business_id,
      dashboardToken: business?.dashboardToken ?? null,
      trialEndsAt: invitation.trial_ends_at ?? previewTrialEndsAt(),
    }
  }

  if (invitation.status !== 'pending') {
    throw new EnrollmentTrialError('Invitation is not eligible for preview', 'invalid_state', 400)
  }

  await assertPreviewAllowed(invitation)

  const trialEndsAt = previewTrialEndsAt()
  const curatedBusinessId = await provisionCuratedForInvitation(invitation, trialEndsAt)

  await publishCurated(curatedBusinessId)
  await markInvitationTrial(token, curatedBusinessId, trialEndsAt)

  const email = resolveContactEmail(invitation, contactEmail)
  if (email) {
    await setCuratedContactEmail(curatedBusinessId, email)
  }

  const business = await getCuratedById(curatedBusinessId)
  const dashboardToken = business?.dashboardToken ?? null
  const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')
  const subscribeUrl = `${siteUrl}/enroll/${token}?subscribe=1`

  if (email) {
    try {
      if (isProDashboardEnabled() && dashboardToken) {
        const dashboardUrl = `${siteUrl}/dashboard/${dashboardToken}`
        await sendEmail(
          email,
          invitation.business_name,
          `You're on QuickProList for the next ${enrollPreviewTrialDays()} days — your listing is live. Track views and clicks: ${dashboardUrl}`,
          { kind: 'transactional' }
        )
      } else {
        await sendEmail(
          email,
          invitation.business_name,
          `You're on QuickProList for the next ${enrollPreviewTrialDays()} days — your listing is live in search. Subscribe anytime to stay on after the preview: ${subscribeUrl}`,
          { kind: 'transactional' }
        )
      }
    } catch (err) {
      console.error('trial welcome email failed:', err)
    }
  }

  return { curatedBusinessId, dashboardToken, trialEndsAt }
}
