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
import { useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Business } from '@/lib/business'
import { formatCategoryLabel, formatCityLabel } from '@/lib/display'
import { isInvitationExpired, type EnrollmentInvitation } from '@/lib/invitations'

type Tab = 'curate' | 'enrollments' | 'reports' | 'requests'

export default function AdminClient({
  adminEmail,
  proDashboardEnabled = false,
}: {
  adminEmail: string
  proDashboardEnabled?: boolean
}) {
  const tabParam = useSearchParams().get('tab')
  const tab: Tab =
    tabParam === 'invitations' ? 'enrollments'
    : tabParam === 'reports' ? 'reports'
    : tabParam === 'requests' ? 'requests'
    : 'curate'
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
  const [openMoreId, setOpenMoreId] = useState<string | null>(null)

  useEffect(() => {
    if (!openMoreId) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Element && target.closest('[data-pro-more-menu]')) return
      setOpenMoreId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openMoreId])

  function loadCurated() {
    return fetch('/api/curated')
      .then((res) => res.json())
      .then((data) => setCurated(data.businesses ?? []))
  }

  useEffect(() => {
    loadCurated()
    loadEnrollments()
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
    await signOut({ redirectTo: '/login' })
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

  const pageTitle = {
    curate: ['Pinned Pros', 'New pros stay hidden from search until you enroll them or start a trial.'],
    enrollments: ['Invitations', 'Payment links you have sent.'],
    reports: ['Reports', 'Who is listed, who is paying, and who is on a trial.'],
    requests: ['Requests', 'People who asked to be listed.'],
  }[tab]

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{pageTitle[0]}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{pageTitle[1]}</p>
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

      {tab === 'curate' && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowManualModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            + Add Pro
          </button>
        </div>
      )}

      {tab === 'curate' && (
        <div className="flex flex-col gap-4">
          {curated.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl ring-1 ring-slate-200">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-slate-700 font-medium">No pinned pros yet.</p>
              <p className="text-sm text-slate-500 mt-1">Use + Add Pro to create one.</p>
            </div>
          )}
          {curated.map((b) => (
            <div
              key={b.id}
              className={`bg-white rounded-2xl ring-1 ring-slate-200 ${openMoreId === b.id ? 'relative z-30' : ''}`}
            >
              <div className="p-0.5">
                <BusinessCard business={b} isFeatured={false} highlighted={false} />
              </div>

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
                  {b.isTrial ? (
                    <TrialBadge trialEndsAt={b.trialEndsAt ?? null} />
                  ) : (
                    <StatusBadge status={listingStatus(b, enrollments)} />
                  )}
                  {b.cities && b.cities.length > 0 && (
                    <>
                      <span className="text-[11px] text-slate-400 font-medium">Cities:</span>
                      {b.cities.map((c) => (
                        <span key={c} className="inline-flex items-center bg-amber-50 text-amber-800 ring-1 ring-amber-200 text-[11px] font-medium px-2 py-0.5 rounded-full">
                          {formatCityLabel(c)}
                        </span>
                      ))}
                    </>
                  )}
                  {b.category && (
                    <span className="text-[11px] font-medium text-slate-500">{formatCategoryLabel(b.category)}</span>
                  )}
                </div>

              <div className="flex items-center gap-1 px-3 py-2 border-t border-slate-100 bg-slate-50 flex-wrap">
                {proDashboardEnabled && listingStatus(b, enrollments) === 'Paid' && b.dashboardToken ? (
                  <button
                    onClick={() => handleCopyDashboardLink(b)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    {copiedDashboardId === b.id ? '✓ Copied' : 'Dashboard link'}
                  </button>
                ) : (
                  <button
                    onClick={() => setEnrollTarget({ business: b, category: b.category ?? CATEGORIES[0].value })}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    Enroll
                  </button>
                )}
                <div className="relative" data-pro-more-menu>
                  <button
                    type="button"
                    aria-expanded={openMoreId === b.id}
                    onClick={() => setOpenMoreId((id) => (id === b.id ? null : b.id))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    More
                  </button>
                  {openMoreId === b.id && (
                    <div className="absolute left-0 z-50 mt-1 min-w-44 rounded-xl bg-white ring-1 ring-slate-200 shadow-lg p-1 flex flex-col">
                      {b.source === 'manual' && (
                        <MenuButton closeMenu={() => setOpenMoreId(null)} onClick={() => setEditTarget(b)}>
                          Edit
                        </MenuButton>
                      )}
                      <MenuButton
                        closeMenu={() => setOpenMoreId(null)}
                        onClick={() => handleProSiteToggle(b)}
                        disabled={proSiteToggling === b.id}
                      >
                        {b.proSiteEnabled ? 'Public profile on' : 'Public profile'}
                      </MenuButton>
                      <MenuButton
                        closeMenu={() => setOpenMoreId(null)}
                        onClick={() =>
                          setTrialTarget({
                            business: b,
                            category: b.category ?? CATEGORIES[0].value,
                            cities: b.cities ?? [],
                          })
                        }
                      >
                        Trial
                      </MenuButton>
                      <MenuButton
                        closeMenu={() => setOpenMoreId(null)}
                        onClick={() => openShareForBusiness(b, '', b.category ?? CATEGORIES[0].value)}
                      >
                        Share
                      </MenuButton>
                      <MenuButton closeMenu={() => setOpenMoreId(null)} onClick={() => setReviewTarget(b)}>
                        Get Reviews
                      </MenuButton>
                      {proDashboardEnabled && listingStatus(b, enrollments) !== 'Paid' && b.dashboardToken && (
                        <MenuButton closeMenu={() => setOpenMoreId(null)} onClick={() => handleCopyDashboardLink(b)}>
                          Dashboard link
                        </MenuButton>
                      )}
                      {listingStatus(b, enrollments) === 'Paid' && (
                        <MenuButton
                          closeMenu={() => setOpenMoreId(null)}
                          onClick={() => setEnrollTarget({ business: b, category: b.category ?? CATEGORIES[0].value })}
                        >
                          Enroll
                        </MenuButton>
                      )}
                      <MenuButton
                        closeMenu={() => setOpenMoreId(null)}
                        onClick={() => {
                          setDeleteError('')
                          setConfirmingDeleteId(b.id)
                        }}
                        danger
                      >
                        Remove
                      </MenuButton>
                    </div>
                  )}
                </div>
                {confirmingDeleteId === b.id && (
                  <div className="ml-auto flex items-center gap-1.5">
                    {deleteError && <span className="text-xs text-rose-600">{deleteError}</span>}
                    <button
                      onClick={() => handleDelete(b.id)}
                      disabled={deletingId === b.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {deletingId === b.id ? 'Removing…' : 'Confirm remove'}
                    </button>
                    <button
                      onClick={() => setConfirmingDeleteId(null)}
                      disabled={deletingId === b.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white ring-1 ring-slate-200 text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
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
                    <p className="text-xs text-slate-500">{formatCategoryLabel(inv.category)}</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">${inv.monthly_price.toFixed(2)}/mo</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {inv.cities.slice(0, 2).map((c: string) => (
                        <span key={c} className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {formatCityLabel(c)}
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

function listingStatus(business: Business, invitations: EnrollmentInvitation[]): 'Draft' | 'Trial' | 'Paid' | 'Invited' | 'Free' {
  if (business.isDraft) return 'Draft'
  if (business.isTrial) return 'Trial'
  const related = invitations.filter((invitation) => invitation.curated_business_id === business.id)
  if (related.some((invitation) => invitation.status === 'paid')) return 'Paid'
  if (related.some((invitation) => invitation.status === 'pending' || invitation.status === 'trial')) return 'Invited'
  return 'Free'
}

function StatusBadge({ status }: { status: ReturnType<typeof listingStatus> }) {
  const styles = {
    Draft: 'bg-slate-100 text-slate-600',
    Trial: 'bg-violet-50 text-violet-700',
    Paid: 'bg-emerald-50 text-emerald-800',
    Invited: 'bg-amber-50 text-amber-800',
    Free: 'bg-slate-50 text-slate-500',
  }
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status}
    </span>
  )
}

function MenuButton({
  children,
  onClick,
  closeMenu,
  disabled,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  closeMenu?: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => {
        closeMenu?.()
        onClick()
      }}
      disabled={disabled}
      className={`text-left px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 ${
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
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
