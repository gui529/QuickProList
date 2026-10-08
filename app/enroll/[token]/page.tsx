import { isProDashboardEnabled } from '@/lib/feature-flags'
import { getInvitationByToken, isInvitationExpired, type EnrollmentInvitation } from '@/lib/invitations'
import { getCuratedById } from '@/lib/kv'
import EnrollClient from './EnrollClient'

const PRIVATE_YELP_DATA_KEYS = [
  'dashboardToken',
  'dashboard_token',
  'contactEmail',
  'contact_email',
  'isTrial',
  'trialEndsAt',
  'reviewUrl',
]

function invitationForClient(invitation: EnrollmentInvitation): EnrollmentInvitation {
  if (!invitation.yelp_data) return invitation
  const yelpData = { ...invitation.yelp_data }
  for (const key of PRIVATE_YELP_DATA_KEYS) delete yelpData[key]
  return { ...invitation, yelp_data: yelpData }
}

export default async function EnrollPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await getInvitationByToken(token)

  if (!invitation) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Link not found</h1>
          <p className="text-slate-600">This enrollment link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  if (isInvitationExpired(invitation)) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Link expired</h1>
          <p className="text-slate-600">This enrollment offer has expired. Please contact the administrator.</p>
        </div>
      </div>
    )
  }

  // Once payment succeeds, `checkout.session.completed` links the invitation
  // to its `curated_businesses` row — fetch that row's `dashboard_token` so
  // the success view can offer a direct dashboard link as a redundant path
  // alongside the welcome email (email delivery isn't guaranteed). See #41.
  const proDashboardEnabled = isProDashboardEnabled()
  const dashboardToken =
    proDashboardEnabled && invitation.curated_business_id
      ? (await getCuratedById(invitation.curated_business_id))?.dashboardToken ?? null
      : null

  return (
    <EnrollClient
      invitation={invitationForClient(invitation)}
      token={token}
      dashboardToken={dashboardToken}
      proDashboardEnabled={proDashboardEnabled}
      initialContactEmail={invitation.contact_email}
    />
  )
}
