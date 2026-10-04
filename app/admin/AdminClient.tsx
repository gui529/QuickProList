'use client'

import { useState, useEffect } from 'react'
import BusinessCard from '@/components/BusinessCard'
import { CATEGORIES } from '@/lib/categories'
import { ManualBusinessModal, EditManualBusinessModal } from '@/components/BusinessModal'
import ShareLinkModal from '@/components/ShareLinkModal'
import ReviewLinkModal from '@/components/ReviewLinkModal'
import EnrollmentLinkModal from '@/components/EnrollmentLinkModal'
import ReportsTab from '@/components/ReportsTab'
import RequestsTab from '@/components/RequestsTab'
import TrialModal from '@/components/TrialModal'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabase/browser'
import type { Business } from '@/lib/business'
import { isInvitationExpired, type EnrollmentInvitation } from '@/lib/invitations'

type Tab = 'curate' | 'enrollments' | 'reports' | 'requests'

export default function AdminClient({ adminEmail }: { adminEmail: string }) {
  const [tab, setTab] = useState<Tab>('curate')
  const [curated, setCurated] = useState<Business[]>([])

  const [showManualModal, setShowManualModal] = useState(false)
  const [enrollTarget, setEnrollTarget] = useState<{ business: Business; category: string } | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentInvitation[]>([])
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)
  const [trialTarget, setTrialTarget] = useState<{ business: Business; category: string; cities: string[] } | null>(null)
  const [proSiteToggling, setProSiteToggling] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [editTarget, setEditTarget] = useState<Business | null>(null)
  const [confirmingDeleteEnrollmentId, setConfirmingDeleteEnrollmentId] = useState<string | null>(null)
  const [deletingEnrollmentId, setDeletingEnrollmentId] = useState<string | null>(null)
  const [enrollmentDeleteError, setEnrollmentDeleteError] = useState('')

  function loadCurated() {
    return fetch('/api/curated')
      .then((res) => res.json())
      .then((data) => setCurated(data.businesses ?? []))
  }

  useEffect(() => {
    loadCurated()
  }, [])

  async function handleDelete(id: string) {
    setDeletingId(id)
    setDeleteError('')
    const res = await fetch(`/api/curated?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setConfirmingDeleteId(null)
      loadCurated()
    } else {
      const data = await res.json().catch(() => ({}))
      setDeleteError(data.error ?? 'Failed to remove')
    }
    setDeletingId(null)
  }

  async function handleDeleteEnrollment(id: string) {
    setDeletingEnrollmentId(id)
    setEnrollmentDeleteError('')
    const res = await fetch(`/api/invitations?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setConfirmingDeleteEnrollmentId(null)
      loadEnrollments()
    } else {
      const data = await res.json().catch(() => ({}))
      setEnrollmentDeleteError(data.error ?? 'Failed to remove')
    }
    setDeletingEnrollmentId(null)
  }

  async function handleSignOut() {
    const supabase = getBrowserSupabase()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const [copiedDashboardId, setCopiedDashboardId] = useState<string | null>(null)
  async function handleCopyDashboardLink(b: Business) {
    if (!b.dashboardToken) return
    const url = `${window.location.origin}/dashboard/${b.dashboardToken}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copy this link:', url)
    }
    setCopiedDashboardId(b.id)
    setTimeout(() => setCopiedDashboardId((cur) => (cur === b.id ? null : cur)), 1500)
  }

  const [shareTarget, setShareTarget] = useState<{ business?: Business; city: string; category: string } | null>(null)
  function openShareForBusiness(b: Business, fallbackCity: string, fallbackCategory: string) {
    setShareTarget({
      business: b,
      city: b.cities?.[0] ?? fallbackCity,
      category: b.category ?? fallbackCategory,
    })
  }
  const [reviewTarget, setReviewTarget] = useState<Business | null>(null)

  async function handleProSiteToggle(b: Business) {
    setProSiteToggling(b.id)
    await fetch('/api/curated', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, proSiteEnabled: !b.proSiteEnabled }),
    })
    await loadCurated()
    setProSiteToggling(null)
  }

  async function loadEnrollments() {
    setLoadingEnrollments(true)
    const res = await fetch('/api/invitations')
    const data = await res.json()
    setEnrollments(data.invitations ?? [])
    setLoadingEnrollments(false)
  }

  useEffect(() => {
    if (tab === 'enrollments') {
      loadEnrollments()
    }
  }, [tab])

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Pinned Pros</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Homeowner searches show up to 3 pros you add by hand.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 font-semibold px-3 py-1.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {curated.length} pinned
          </span>
          <span className="hidden sm:inline text-xs text-slate-500 truncate max-w-[180px]">{adminEmail}</span>
          <button
            onClick={handleSignOut}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          <TabButton active={tab === 'curate'} onClick={() => setTab('curate')}>Pinned Pros</TabButton>
          <TabButton active={tab === 'enrollments'} onClick={() => setTab('enrollments')}>Invitations</TabButton>
          <TabButton active={tab === 'reports'} onClick={() => setTab('reports')}>Reports</TabButton>
          <TabButton active={tab === 'requests'} onClick={() => setTab('requests')}>Requests</TabButton>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Link
            href="/admin/campaigns"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Campaigns
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
          <button
            onClick={() => setShowManualModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            + Add Pro
          </button>
        </div>
      </div>

      {tab === 'curate' && (
        <div className="flex flex-col gap-4">
          {curated.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl ring-1 ring-slate-200">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-slate-700 font-medium">No pinned pros yet.</p>
              <p className="text-sm text-slate-500 mt-1">Add a pro with the button above.</p>
            </div>
          )}
          {curated.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
              <div className="p-0.5">
                <BusinessCard business={b} />
              </div>

              {/* Metadata row */}
              {(b.cities?.length || b.isTrial || b.source === 'yelp') ? (
                <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
                  {b.source === 'yelp' && (
                    <span className="inline-flex items-center bg-slate-100 text-slate-600 ring-1 ring-slate-200 text-[11px] font-medium px-2 py-0.5 rounded-full">
                      Old Yelp import — hidden from search
                    </span>
                  )}
                  {b.cities && b.cities.length > 0 && (
                    <>
                      <span className="text-[11px] text-slate-400 font-medium">Cities:</span>
                      {b.cities.map((c) => (
                        <span key={c} className="inline-flex items-center bg-amber-50 text-amber-800 ring-1 ring-amber-200 text-[11px] font-medium px-2 py-0.5 rounded-full">
                          {c}
                        </span>
                      ))}
                    </>
                  )}
                  {b.isTrial && <TrialBadge trialEndsAt={b.trialEndsAt ?? null} />}
                </div>
              ) : null}

              {/* Action bar */}
              <div className="flex items-center gap-1 px-3 py-2 border-t border-slate-100 bg-slate-50 flex-wrap">
                {/* Left group: editing */}
                {b.source === 'manual' && (
                  <button
                    onClick={() => setEditTarget(b)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleProSiteToggle(b)}
                  disabled={proSiteToggling === b.id}
                  title={b.proSiteEnabled ? 'ProSite live — click to disable' : 'Enable ProSite'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                    b.proSiteEnabled
                      ? 'bg-violet-600 text-white hover:bg-violet-700'
                      : 'bg-white ring-1 ring-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {b.proSiteEnabled ? '✦ ProSite' : 'ProSite'}
                </button>

                {/* Divider */}
                <span className="mx-1 h-4 w-px bg-slate-200" />

                {/* Middle group: outreach */}
                <button
                  onClick={() => setEnrollTarget({ business: b, category: b.category ?? CATEGORIES[0].value })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Enroll
                </button>
                <button
                  onClick={() => setTrialTarget({ business: b, category: b.category ?? CATEGORIES[0].value, cities: b.cities ?? [] })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                >
                  Trial
                </button>

                {/* Divider */}
                <span className="mx-1 h-4 w-px bg-slate-200" />

                {/* Right group: share + remove */}
                <button
                  onClick={() => openShareForBusiness(b, '', b.category ?? CATEGORIES[0].value)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <ShareIcon />
                  Share
                </button>
                <button
                  onClick={() => setReviewTarget(b)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors"
                >
                  Get Reviews
                </button>
                {b.dashboardToken && (
                  <button
                    onClick={() => handleCopyDashboardLink(b)}
                    title="Copy this business's performance dashboard link"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    {copiedDashboardId === b.id ? '✓ Copied' : 'Dashboard link'}
                  </button>
                )}

                <div className="ml-auto flex items-center gap-1.5">
                  {deleteError && confirmingDeleteId === b.id && (
                    <span className="text-xs text-rose-600">{deleteError}</span>
                  )}
                  {confirmingDeleteId === b.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(b.id)}
                        disabled={deletingId === b.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === b.id ? 'Removing…' : 'Confirm remove'}
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        disabled={deletingId === b.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setDeleteError(''); setConfirmingDeleteId(b.id) }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showManualModal && (
        <ManualBusinessModal
          onClose={() => setShowManualModal(false)}
          onSaved={() => {
            setShowManualModal(false)
            loadCurated()
          }}
        />
      )}

      {editTarget && (
        <EditManualBusinessModal
          business={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null)
            loadCurated()
          }}
        />
      )}

      {tab === 'enrollments' && (
        <div className="flex flex-col gap-4">
          {loadingEnrollments ? (
            <div className="text-center py-8 text-slate-500">Loading enrollments…</div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl ring-1 ring-slate-200">
              <p className="text-4xl mb-3">📬</p>
              <p className="text-slate-700 font-medium">No enrollment links sent yet.</p>
              <p className="text-sm text-slate-500 mt-1">Create links to invite pros to join QuickProList.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <div>Business</div>
                <div>Cities & Price</div>
                <div>Status</div>
                <div>Link</div>
                <div>Remove</div>
              </div>
              {enrollments.map((inv) => (
                <div key={inv.id} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 p-4 border-b border-slate-100 last:border-b-0 items-center">
                  <div>
                    <p className="font-medium text-slate-900">{inv.business_name}</p>
                    <p className="text-xs text-slate-500">{inv.category}</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">${inv.monthly_price.toFixed(2)}/mo</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {inv.cities.slice(0, 2).map((c: string) => (
                        <span key={c} className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {c}
                        </span>
                      ))}
                      {inv.cities.length > 2 && (
                        <span className="text-xs text-slate-500">+{inv.cities.length - 2}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    {inv.status === 'trial' ? (
                      <TrialBadge trialEndsAt={inv.trial_ends_at ?? null} />
                    ) : isInvitationExpired(inv) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        expired
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                          inv.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : inv.status === 'canceled'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {inv.status === 'paid' ? '✓ ' : ''}{inv.status}
                      </span>
                    )}
                  </div>
                  <a
                    href={`${window.location.origin}/enroll/${inv.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 truncate"
                    title="Open enrollment page"
                  >
                    View
                  </a>
                  <div className="flex flex-col items-end gap-1">
                    {enrollmentDeleteError && confirmingDeleteEnrollmentId === inv.id && (
                      <span className="text-xs text-rose-600">{enrollmentDeleteError}</span>
                    )}
                    {confirmingDeleteEnrollmentId === inv.id ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleDeleteEnrollment(inv.id)}
                          disabled={deletingEnrollmentId === inv.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                        >
                          {deletingEnrollmentId === inv.id ? 'Removing…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteEnrollmentId(null)}
                          disabled={deletingEnrollmentId === inv.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEnrollmentDeleteError(''); setConfirmingDeleteEnrollmentId(inv.id) }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && <ReportsTab />}

      {tab === 'requests' && <RequestsTab />}

      {trialTarget && (
        <TrialModal
          business={trialTarget.business}
          defaultCategory={trialTarget.category}
          defaultCities={trialTarget.cities}
          onClose={() => setTrialTarget(null)}
          onSaved={() => {
            setTrialTarget(null)
            loadCurated()
            if (tab === 'enrollments') loadEnrollments()
          }}
        />
      )}

      <ShareLinkModal
        open={!!shareTarget}
        onClose={() => setShareTarget(null)}
        business={shareTarget?.business}
        city={shareTarget?.city ?? ''}
        category={shareTarget?.category ?? ''}
      />

      <ReviewLinkModal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        business={reviewTarget ?? undefined}
      />

      {enrollTarget && (
        <EnrollmentLinkModal
          open={!!enrollTarget}
          onClose={() => setEnrollTarget(null)}
          business={enrollTarget.business}
          defaultCategory={enrollTarget.category}
        />
      )}
    </div>
  )
}

function TrialBadge({ trialEndsAt }: { trialEndsAt: string | null }) {
  if (!trialEndsAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">
        Unlimited trial
      </span>
    )
  }
  const end = new Date(trialEndsAt)
  const now = new Date()
  if (end <= now) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
        Trial expired
      </span>
    )
  }
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 864e5)
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">
      Trial · {daysLeft}d left
    </span>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
