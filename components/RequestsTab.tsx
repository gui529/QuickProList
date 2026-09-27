'use client'

import { useState, useEffect } from 'react'
import type { ListingRequest } from '@/lib/listing-requests'

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RequestsTab() {
  const [requests, setRequests] = useState<ListingRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function load() {
    return Promise.resolve()
      .then(() => {
        setLoading(true)
        setError('')
        return fetch('/api/list-business')
      })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) {
          setError(data.error ?? 'Failed to load')
        } else {
          setRequests(data.requests ?? [])
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {loading && <div className="text-center py-8 text-slate-500">Loading…</div>}
      {error && <div className="text-center py-8 text-rose-600">{error}</div>}

      {!loading && !error && requests.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl ring-1 ring-slate-200">
          <p className="text-4xl mb-3">📥</p>
          <p className="text-slate-700 font-medium">No listing requests yet.</p>
          <p className="text-sm text-slate-500 mt-1">Submissions from &quot;Apply to be listed&quot; will show up here.</p>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wide">
            <div>Business</div>
            <div>Contact</div>
            <div>Category / ZIP</div>
            <div>Submitted</div>
          </div>
          {requests.map((r) => (
            <div key={r.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-slate-100 last:border-b-0 items-start">
              <div>
                <p className="font-medium text-slate-900">{r.business_name}</p>
                {r.message && <p className="text-xs text-slate-500 mt-0.5">{r.message}</p>}
              </div>
              <div className="text-sm text-slate-600">
                <p>{r.contact_name}</p>
                <p className="text-xs text-slate-500">{r.email}</p>
                {r.phone && <p className="text-xs text-slate-500">{r.phone}</p>}
              </div>
              <div className="text-sm text-slate-600">
                <p className="capitalize">{r.category}</p>
                <p className="text-xs text-slate-500">{r.zip}</p>
              </div>
              <div className="text-sm text-slate-500 whitespace-nowrap">{formatDate(r.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
