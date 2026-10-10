'use client'

import { useState, useEffect } from 'react'
import type { CampaignContact } from '@/lib/campaigns'
import { CampaignContactLines } from '@/components/CampaignContactLines'

export default function CampaignReportsTab() {
  const [contacts, setContacts] = useState<CampaignContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

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

  async function setProResponse(id: string, response: 'yes' | 'no' | 'clear') {
    setBusyId(id)
    setError('')
    try {
      const res = await fetch(`/api/campaigns/contacts/${id}/pro-response`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ response }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Campaign Reports</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Sent outreach. When a pro replies yes, mark them <strong className="font-semibold text-slate-700">Approved</strong>{' '}
            here.
          </p>
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
          <div className="hidden lg:grid grid-cols-[auto_1.2fr_auto_auto_auto_auto_minmax(0,1.2fr)] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wide">
            <div>Sent At</div>
            <div>Business & contact</div>
            <div>Via</div>
            <div>City</div>
            <div>Category</div>
            <div>Send</div>
            <div>Pro reply</div>
          </div>
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-3 lg:grid lg:grid-cols-[auto_1.2fr_auto_auto_auto_auto_minmax(0,1.2fr)] gap-x-3 px-4 py-3 border-b border-slate-100 last:border-b-0 lg:items-start"
            >
              <div className="text-xs text-slate-500 whitespace-nowrap">
                {new Date(c.sent_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-900 text-sm">{c.business_name}</p>
                <CampaignContactLines
                  email={c.channel === 'email' ? c.email : null}
                  phone={c.phone}
                  website={c.website}
                />
                {c.error_message && (
                  <p className="text-xs text-rose-600 mt-1 truncate max-w-[280px]" title={c.error_message}>
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
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {c.pro_response === 'yes' ? (
                  <>
                    <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900">
                      Approved
                    </span>
                    {c.invitation_token && (
                      <a
                        href={`/enroll/${c.invitation_token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
                      >
                        Enroll link
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => setProResponse(c.id, 'clear')}
                      className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </>
                ) : c.pro_response === 'no' ? (
                  <>
                    <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                      Said no
                    </span>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => setProResponse(c.id, 'clear')}
                      className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </>
                ) : c.status === 'sent' ? (
                  <>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => setProResponse(c.id, 'yes')}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Mark approved
                    </button>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => setProResponse(c.id, 'no')}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                    >
                      Said no
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
