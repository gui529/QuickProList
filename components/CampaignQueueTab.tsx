'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CampaignProspectClient } from '@/lib/campaign-prospects'

export default function CampaignQueueTab() {
  const [prospects, setProspects] = useState<CampaignProspectClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/campaigns/prospects')
      const raw = await res.text()
      const data: { prospects?: CampaignProspectClient[]; error?: string } = raw
        ? (JSON.parse(raw) as { prospects?: CampaignProspectClient[]; error?: string })
        : {}
      if (!res.ok) throw new Error(data.error ?? (res.statusText || `HTTP ${res.status}`))
      setProspects(data.prospects ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function action(path: string, id: string) {
    setBusyId(id)
    setError('')
    try {
      const res = await fetch(path, { method: 'POST' })
      const raw = await res.text()
      const data = raw ? (JSON.parse(raw) as { error?: string }) : {}
      if (!res.ok) throw new Error(data.error ?? (res.statusText || `HTTP ${res.status}`))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  async function sendAllApproved() {
    if (!confirm('Send campaign email to every approved prospect?')) return
    const approved = prospects.filter((p) => p.status === 'approved')
    for (const p of approved) {
      await action(`/api/campaigns/prospects/${p.id}/send`, p.id)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading queue…</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Prospects are added by the separate discovery worker (Cursor CLI / outreach) into{' '}
        <code className="text-xs bg-slate-100 px-1 rounded">campaign_prospects</code>. Review here,
        then send from production.
      </p>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => load()}
          className="text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={sendAllApproved}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-slate-900 hover:bg-amber-400"
        >
          Send all approved
        </button>
      </div>

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-xl px-4 py-2">{error}</p>
      )}

      {prospects.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12 bg-white rounded-2xl ring-1 ring-slate-200">
          No prospects in the queue yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {prospects.map((p) => (
            <li
              key={p.id}
              className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{p.businessName}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-sm text-slate-600 truncate">{p.email}</p>
                <p className="text-xs text-slate-500">{p.city} · {p.category}</p>
                {p.errorMessage && <p className="text-xs text-rose-600 mt-1">{p.errorMessage}</p>}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {p.status === 'pending_review' && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => action(`/api/campaigns/prospects/${p.id}/approve`, p.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => action(`/api/campaigns/prospects/${p.id}/reject`, p.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100"
                    >
                      Reject
                    </button>
                  </>
                )}
                {p.status === 'approved' && (
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => action(`/api/campaigns/prospects/${p.id}/send`, p.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white disabled:opacity-50"
                  >
                    Send email
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: CampaignProspectClient['status'] }) {
  const colors: Record<string, string> = {
    pending_review: 'bg-amber-100 text-amber-900',
    approved: 'bg-emerald-100 text-emerald-900',
    sent: 'bg-slate-200 text-slate-700',
    failed: 'bg-rose-100 text-rose-800',
    rejected: 'bg-slate-100 text-slate-500',
  }
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors[status] ?? ''}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
