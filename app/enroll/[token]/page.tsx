import { getInvitationByToken, isInvitationExpired } from '@/lib/invitations'
import EnrollClient from './EnrollClient'

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

  return <EnrollClient invitation={invitation} token={token} />
}
