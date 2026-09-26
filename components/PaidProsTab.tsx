'use client'

import { useState, useEffect } from 'react'
import type { PaidPro } from '@/app/api/paid-pros/route'

function formatDate(ts: number | string | null): string {
  if (!ts) return '—'
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ pro }: { pro: PaidPro }) {
  if (pro.status === 'canceled') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
        Canceled
      </span>
    )
  }
  if (pro.cancel_at_period_end) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
        Canceling
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  )
}

function RenewsCell({ pro }: { pro: PaidPro }) {
  if (pro.status === 'canceled') return <span className="text-sm text-slate-400">—</span>
  if (!pro.current_period_end) return <span className="text-sm text-slate-400">—</span>
  const label = pro.cancel_at_period_end ? 'Expires' : 'Renews'
  const cls = pro.cancel_at_period_end ? 'text-amber-600' : 'text-slate-700'
  return (
    <span className={`text-sm ${cls}`}>
      {label} {formatDate(pro.current_period_end)}
    </span>
  )
}

export default function PaidProsTab() {
  const [pros, setPros] = useState<PaidPro[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  function load() {
    return Promise.resolve()
      .then(() => {
        setLoading(true)
        setError('')
        return fetch('/api/paid-pros')
      })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) {
          setError(data.error ?? 'Failed to load')
        } else {
          setPros(data.pros)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCancel(id: string) {
    setCancelingId(id)
    setRowErrors((prev) => { const next = { ...prev }; delete next[id]; return next })
    const res = await fetch(`/api/paid-pros/${id}/cancel`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setRowErrors((prev) => ({ ...prev, [id]: data.error ?? 'Failed to cancel' }))
    } else {
      setPros((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: 'canceled' as const, cancel_at_period_end: true } : p
        )
      )
    }
    setCancelingId(null)
    setConfirmingId(null)
  }

  const active = pros.filter((p) => p.status === 'paid' && !p.cancel_at_period_end)
  const mrr = active.reduce((sum, p) => sum + p.monthly_price, 0)

  return (
    <div className="flex flex-col gap-4">
      {pros.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          <div className="bg-white rounded-xl ring-1 ring-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500 font-medium">Active Subscriptions</p>
            <p className="text-2xl font-bold text-slate-900">{active.length}</p>
          </div>
          <div className="bg-white rounded-xl ring-1 ring-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500 font-medium">Monthly Revenue</p>
            <p className="text-2xl font-bold text-emerald-700">${mrr.toFixed(2)}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-slate-500">Loading…</div>
      )}

      {error && (
        <div className="text-center py-8 text-rose-600">{error}</div>
      )}

      {!loading && !error && pros.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl ring-1 ring-slate-200">
          <p className="text-4xl mb-3">💳</p>
          <p className="text-slate-700 font-medium">No paid pros yet.</p>
          <p className="text-sm text-slate-500 mt-1">Pros appear here after completing enrollment.</p>
        </div>
      )}

      {!loading && pros.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 p-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wide">
            <div>Business</div>
            <div>Price/mo</div>
            <div>Enrolled</div>
            <div>Renews On</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {pros.map((pro) => (
            <div
              key={pro.id}
              className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 p-4 border-b border-slate-100 last:border-b-0 items-center"
            >
              <div>
                <p className="font-medium text-slate-900">{pro.business_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{pro.category}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {pro.cities.slice(0, 3).map((c) => (
                    <span key={c} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                  {pro.cities.length > 3 && (
                    <span className="text-xs text-slate-400">+{pro.cities.length - 3}</span>
                  )}
                </div>
              </div>

              <div className="text-sm font-medium text-slate-900 whitespace-nowrap">
                ${pro.monthly_price.toFixed(2)}
              </div>

              <div className="text-sm text-slate-600 whitespace-nowrap">
                {formatDate(pro.created_at)}
              </div>

              <div className="whitespace-nowrap">
                <RenewsCell pro={pro} />
              </div>

              <div>
                <StatusBadge pro={pro} />
              </div>

              <div className="flex items-center gap-2">
                {rowErrors[pro.id] && (
                  <span className="text-xs text-rose-600">{rowErrors[pro.id]}</span>
                )}
                {pro.status === 'paid' && !pro.cancel_at_period_end && (
                  confirmingId === pro.id ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleCancel(pro.id)}
                        disabled={cancelingId === pro.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                      >
                        {cancelingId === pro.id ? 'Canceling…' : 'Confirm cancel'}
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={cancelingId === pro.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(pro.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      Cancel
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
