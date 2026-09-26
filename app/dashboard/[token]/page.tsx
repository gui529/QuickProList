import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCuratedByDashboardToken } from '@/lib/kv'
import { listInvitations } from '@/lib/invitations'
import { deriveStatus, type BusinessReport } from '@/lib/reports'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<BusinessReport['current_status'], string> = {
  paid: 'Active subscription',
  trial: 'Trial',
  'expired-trial': 'Trial expired',
  pending: 'Pending',
  canceled: 'Canceled',
  none: 'Inactive',
}

const STATUS_CLASSES: Record<BusinessReport['current_status'], string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  trial: 'bg-violet-50 text-violet-700',
  'expired-trial': 'bg-slate-100 text-slate-500',
  pending: 'bg-amber-50 text-amber-700',
  canceled: 'bg-slate-100 text-slate-600',
  none: 'bg-slate-50 text-slate-400',
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 min-w-[140px] bg-white rounded-2xl ring-1 ring-slate-200 px-5 py-6 text-center">
      <div className="text-3xl font-extrabold text-slate-900 leading-none">{value.toLocaleString()}</div>
      <div className="mt-2 text-xs uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
    </div>
  )
}

export default async function BusinessDashboardPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const business = await getCuratedByDashboardToken(token)
  if (!business) notFound()

  const allInvitations = await listInvitations()
  const invitations = allInvitations.filter((i) => i.curated_business_id === business.id)
  const status = deriveStatus(
    { is_trial: business.isTrial, trial_ends_at: business.trialEndsAt },
    invitations
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium mb-4"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            QuickProList
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{business.name}</h1>
            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_CLASSES[status]}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">Your performance dashboard</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <span className="inline-block text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
          Lifetime stats
        </span>
        <div className="flex flex-wrap gap-4">
          <StatCard label="Profile views" value={business.profileViews} />
          <StatCard label="Phone clicks" value={business.phoneClicks} />
          <StatCard label="Website clicks" value={business.websiteClicks} />
          <StatCard label="Directions clicks" value={business.directionsClicks} />
        </div>
      </main>
    </div>
  )
}
