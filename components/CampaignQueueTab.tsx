'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CampaignProspectClient } from '@/lib/campaign-prospects'
import { CampaignContactLines, ProResponseBadge } from '@/components/CampaignContactLines'
import { CampaignProspectLogo } from '@/components/CampaignProspectLogo'
import { readJsonResponse } from '@/lib/read-json-response'

export default function CampaignQueueTab() {
  const [prospects, setProspects] = useState<CampaignProspectClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [viewedOnly, setViewedOnly] = useState(false)

  const load = useCallback(() => {
    return Promise.resolve()
      .then(() => {
        setError('')
        return fetch('/api/campaigns/prospects')
      })
      .then((res) =>
        readJsonResponse<{
          prospects?: CampaignProspectClient[]
          error?: string
        }>(res).then((data) => ({ res, data }))
      )
      .then(({ res, data }) => {
        if (!res.ok) throw new Error(data.error ?? (res.statusText || `HTTP ${res.status}`))
        setProspects(data.prospects ?? [])
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function action(path: string, id: string) {
    setBusyId(id)
    setError('')
    try {
      const res = await fetch(path, { method: 'POST' })
      const data = await readJsonResponse<{
        error?: string
        logoFound?: boolean
      }>(res)
      if (!res.ok) throw new Error(data.error ?? (res.statusText || `HTTP ${res.status}`))
      if (path.includes('fetch-logo') && data.logoFound === false) {
        setError(data.error ?? 'No logo found on website')
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  async function sendAllApproved() {
    if (!confirm('Send campaign email to every approved prospect?')) return
    const approved = prospects.filter((p) => p.status === 'approved' || p.status === 'failed')
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => load()}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Refresh
          </button>
          <label className="text-xs text-slate-600 inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={viewedOnly}
              onChange={(e) => setViewedOnly(e.target.checked)}
            />
            Viewed
          </label>
        </div>
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
          {prospects.filter((p) => !viewedOnly || (p.preview?.viewCount ?? 0) > 0).map((p) => (
            <li
              key={p.id}
              className="bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="min-w-0 flex gap-3">
                <CampaignProspectLogo name={p.businessName} logoUrl={p.logoUrl} size={44} />
                <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{p.businessName}</span>
                  <StatusBadge status={p.status} />
                  <ProResponseBadge response={p.proResponse} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{p.city} · {p.category}</p>
                <CampaignContactLines email={p.email} phone={p.phone} website={p.website} />
                {p.preview && (
                  <p className="text-xs text-slate-500 mt-1">
                    Preview views: {p.preview.viewCount}
                    {p.preview.firstViewedAt ? ` · first ${p.preview.firstViewedAt}` : ' · not viewed yet'}
                    {p.preview.lastViewedAt ? ` · last ${p.preview.lastViewedAt}` : ''}
                    {p.preview.lastRef ? ` · ref ${p.preview.lastRef}` : ''}
                    {' · '}
                    <a href={p.preview.path} className="underline">
                      Open preview
                    </a>
                  </p>
                )}
                {p.errorMessage && <p className="text-xs text-rose-600 mt-1">{p.errorMessage}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {p.website && (
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => action(`/api/campaigns/prospects/${p.id}/fetch-logo`, p.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  >
                    {p.logoUrl ? 'Refresh logo' : 'Fetch logo'}
                  </button>
                )}
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
                {(p.status === 'approved' || p.status === 'failed') && (
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => action(`/api/campaigns/prospects/${p.id}/send`, p.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white disabled:opacity-50"
                  >
                    {p.status === 'failed' ? 'Retry send' : 'Send email'}
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
