'use client'

import { useState, useEffect } from 'react'
import type { CampaignContact } from '@/lib/campaigns'

export default function CampaignReportsTab() {
  const [contacts, setContacts] = useState<CampaignContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function load() {
    return Promise.resolve()
      .then(() => {
        setLoading(true)
        setError('')
        return fetch('/api/campaigns')
      })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) {
          setError(data.error ?? 'Failed to load')
        } else {
          setContacts(data.contacts ?? [])
        }
      })
      .catch(() => {
        setError('Network error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Campaign Reports</h3>
          <p className="text-sm text-slate-500 mt-0.5">All outreach messages sent to pros.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading…</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl ring-1 ring-slate-200">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-slate-700 font-medium">No campaigns sent yet.</p>
          <p className="text-sm text-slate-500 mt-1">Go to the Campaign tab to send your first outreach.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wide">
            <div>Sent At</div>
            <div>Business</div>
            <div>Via</div>
            <div>Contact</div>
            <div>City</div>
            <div>Category</div>
            <div>Status</div>
          </div>
          {contacts.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 items-center"
            >
              <div className="text-xs text-slate-500 whitespace-nowrap">
                {new Date(c.sent_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div>
                <p className="font-medium text-slate-900 text-sm">{c.business_name}</p>
                {c.error_message && (
                  <p className="text-xs text-rose-600 mt-0.5 truncate max-w-[200px]" title={c.error_message}>
                    {c.error_message}
                  </p>
                )}
                {c.message_sid && (
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{c.message_sid.slice(0, 20)}…</p>
                )}
              </div>
              <div>
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                  c.channel === 'email' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {c.channel === 'email' ? '✉️ Email' : '📱 SMS'}
                </span>
              </div>
              <div className="text-sm text-slate-700 whitespace-nowrap">
                {c.channel === 'email' ? c.email : c.phone}
              </div>
              <div className="text-sm text-slate-500">{c.city ?? '—'}</div>
              <div className="text-sm text-slate-500">{c.category ?? '—'}</div>
              <div>
                <span
                  className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                    c.status === 'sent'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {c.status === 'sent' ? '✓ Sent' : '✗ Failed'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
