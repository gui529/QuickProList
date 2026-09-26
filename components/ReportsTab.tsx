'use client'

import { useState, useEffect } from 'react'
import type { BusinessReport } from '@/lib/reports'
import type { EnrollmentInvitation } from '@/lib/invitations'
import PaidProsTab from '@/components/PaidProsTab'

type ReportSection = 'businesses' | 'subscriptions'

function formatDate(ts: string | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_LABELS: Record<BusinessReport['current_status'], string> = {
  paid: 'Paid',
  trial: 'Trial',
  'expired-trial': 'Trial Expired',
  pending: 'Pending',
  canceled: 'Canceled',
  none: 'Free',
}

const STATUS_CLASSES: Record<BusinessReport['current_status'], string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  trial: 'bg-violet-50 text-violet-700',
  'expired-trial': 'bg-slate-100 text-slate-500',
  pending: 'bg-amber-50 text-amber-700',
  canceled: 'bg-slate-100 text-slate-600',
  none: 'bg-slate-50 text-slate-400',
}

function StatusBadge({ status }: { status: BusinessReport['current_status'] }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CLASSES[status]}`}>
      {status === 'paid' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />}
      {STATUS_LABELS[status]}
    </span>
  )
}

const INV_STATUS_CLASSES: Record<EnrollmentInvitation['status'], string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  trial: 'bg-violet-50 text-violet-700',
  pending: 'bg-amber-50 text-amber-700',
  expired: 'bg-slate-100 text-slate-500',
  canceled: 'bg-slate-100 text-slate-600',
}

function InvitationTimeline({ invitations }: { invitations: EnrollmentInvitation[] }) {
  if (invitations.length === 0) {
    return <p className="text-sm text-slate-400 py-3">No invitations yet.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
            <th className="text-left py-2 pr-4 font-semibold">Date</th>
            <th className="text-left py-2 pr-4 font-semibold">Type</th>
            <th className="text-left py-2 pr-4 font-semibold">Price</th>
            <th className="text-left py-2 pr-4 font-semibold">Status</th>
            <th className="text-left py-2 pr-4 font-semibold">Trial Ends</th>
            <th className="text-left py-2 font-semibold">Canceled On</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) => (
            <tr key={inv.id} className="border-b border-slate-100 last:border-b-0">
              <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{formatDate(inv.created_at)}</td>
              <td className="py-2 pr-4 text-slate-700 capitalize whitespace-nowrap">
                {inv.status === 'trial' ? 'Trial' : inv.status === 'paid' ? 'Paid' : inv.status === 'pending' ? 'Pending' : inv.status === 'canceled' ? 'Canceled' : 'Expired'}
              </td>
              <td className="py-2 pr-4 text-slate-700 whitespace-nowrap">
                {inv.monthly_price === 0 ? 'Free' : `$${inv.monthly_price.toFixed(2)}/mo`}
              </td>
              <td className="py-2 pr-4 whitespace-nowrap">
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${INV_STATUS_CLASSES[inv.status]}`}>
                  {inv.status}
                </span>
              </td>
              <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{formatDate(inv.trial_ends_at)}</td>
              <td className="py-2 text-slate-600 whitespace-nowrap">{formatDate(inv.canceled_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function SectionButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

function BusinessReports() {
  const [reports, setReports] = useState<BusinessReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function load() {
    return Promise.resolve()
      .then(() => {
        setLoading(true)
        setError('')
        return fetch('/api/reports')
      })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) {
          setError(data.error ?? 'Failed to load')
        } else {
          setReports(data.reports)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const paidCount = reports.filter((r) => r.current_status === 'paid').length
  const trialCount = reports.filter((r) => r.current_status === 'trial').length

  return (
    <div className="flex flex-col gap-4">
      {reports.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          <div className="bg-white rounded-xl ring-1 ring-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500 font-medium">Total Pinned</p>
            <p className="text-2xl font-bold text-slate-900">{reports.length}</p>
          </div>
          <div className="bg-white rounded-xl ring-1 ring-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500 font-medium">Active Paid</p>
            <p className="text-2xl font-bold text-emerald-700">{paidCount}</p>
          </div>
          <div className="bg-white rounded-xl ring-1 ring-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500 font-medium">Active Trials</p>
            <p className="text-2xl font-bold text-violet-700">{trialCount}</p>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-slate-500">Loading…</div>}
      {error && <div className="text-center py-8 text-rose-600">{error}</div>}

      {!loading && !error && reports.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl ring-1 ring-slate-200">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-slate-700 font-medium">No pinned pros yet.</p>
          <p className="text-sm text-slate-500 mt-1">Reports appear here once pros are pinned.</p>
        </div>
      )}

      {!loading && reports.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wide">
            <div>Business</div>
            <div>Source</div>
            <div>Category</div>
            <div>Cities</div>
            <div>Pinned On</div>
            <div>Status</div>
            <div>Invitations</div>
          </div>

          {reports.map((r) => (
            <div key={r.id} className="border-b border-slate-100 last:border-b-0">
              <div
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 px-4 py-3 items-center cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              >
                <div>
                  <p className="font-medium text-slate-900">{r.name}</p>
                  {r.pro_site_enabled && (
                    <span className="text-xs text-indigo-600 font-medium">ProSite on</span>
                  )}
                </div>
                <div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize">
                    {r.source}
                  </span>
                </div>
                <div className="text-sm text-slate-600 whitespace-nowrap">{r.category}</div>
                <div className="flex flex-wrap gap-1">
                  {r.cities.slice(0, 2).map((c) => (
                    <span key={c} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                  {r.cities.length > 2 && (
                    <span className="text-xs text-slate-400">+{r.cities.length - 2}</span>
                  )}
                </div>
                <div className="text-sm text-slate-600 whitespace-nowrap">{formatDate(r.pinned_at)}</div>
                <div>
                  <StatusBadge status={r.current_status} />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm text-slate-500">{r.actions_count}</span>
                  <ChevronIcon expanded={expandedId === r.id} />
                </div>
              </div>

              {expandedId === r.id && (
                <div className="px-6 pb-4 pt-2 border-t border-slate-100 bg-slate-50/60">
                  <InvitationTimeline invitations={r.invitations} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReportsTab() {
  const [section, setSection] = useState<ReportSection>('businesses')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <SectionButton active={section === 'businesses'} onClick={() => setSection('businesses')}>
          Business Reports
        </SectionButton>
        <SectionButton active={section === 'subscriptions'} onClick={() => setSection('subscriptions')}>
          Subscriptions
        </SectionButton>
      </div>

      {section === 'businesses' && <BusinessReports />}
      {section === 'subscriptions' && <PaidProsTab />}
    </div>
  )
}
