'use client'

import { useState } from 'react'
import { CATEGORIES } from '@/lib/categories'
import { DEFAULT_MESSAGE } from '@/lib/campaigns'
import type { Business } from '@/lib/yelp'
import type { CampaignContact } from '@/lib/campaigns'

type Channel = 'sms' | 'email'

interface SendModalProps {
  business: { name: string; phone: string; yelpId?: string; category?: string; city?: string } | null
  onClose: () => void
  onSent: (contact: CampaignContact) => void
}

function SendModal({ business, onClose, onSent }: SendModalProps) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  if (!business) return null

  async function handleSend() {
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'sms',
          businessName: business!.name,
          phone: business!.phone,
          yelpId: business!.yelpId,
          category: business!.category,
          city: business!.city,
          message,
        }),
      })
      const data = await res.json()
      if (!res.ok && !data.contact) {
        setError(data.error ?? 'Failed to send')
        setSending(false)
        return
      }
      onSent(data.contact)
      onClose()
    } catch {
      setError('Network error')
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Send Campaign SMS</h3>
          <p className="text-sm text-slate-500 mt-0.5">{business.name} · {business.phone}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
          <p className="text-xs text-slate-400">{message.length} chars · ~{Math.ceil(message.length / 160)} SMS segment{Math.ceil(message.length / 160) !== 1 ? 's' : ''}</p>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} disabled={sending} className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending…' : 'Send Campaign'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ManualModalProps {
  onClose: () => void
  onSent: (contact: CampaignContact) => void
}

function ManualSendModal({ onClose, onSent }: ManualModalProps) {
  const [channel, setChannel] = useState<Channel>('sms')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const canSend = name.trim() && message.trim() &&
    (channel === 'sms' ? !!phone.trim() : !!email.trim())

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          businessName: name.trim(),
          phone: channel === 'sms' ? phone.trim() : undefined,
          email: channel === 'email' ? email.trim() : undefined,
          category: category.trim() || undefined,
          city: city.trim() || undefined,
          message,
        }),
      })
      const data = await res.json()
      if (!res.ok && !data.contact) {
        setError(data.error ?? 'Failed to send')
        setSending(false)
        return
      }
      onSent(data.contact)
      onClose()
    } catch {
      setError('Network error')
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-900">Send Campaign Manually</h3>

        <div className="flex gap-2">
          <button
            onClick={() => setChannel('sms')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${channel === 'sms' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            📱 SMS
          </button>
          <button
            onClick={() => setChannel('email')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${channel === 'email' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            ✉️ Email
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Business Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Joe's Plumbing" className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          {channel === 'sms' ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone *</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(404) 555-1234" type="tel" className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email *</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@business.com" type="email" className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                <option value="">—</option>
                {CATEGORIES.map(({ label, value }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Atlanta, GA" className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            <p className="text-xs text-slate-400">{message.length} chars</p>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} disabled={sending} className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !canSend}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending…' : 'Send Campaign'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CampaignTab() {
  const [city, setCity] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [results, setResults] = useState<Business[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [sendTarget, setSendTarget] = useState<{
    name: string; phone: string; yelpId?: string; category?: string; city?: string
  } | null>(null)
  const [showManualModal, setShowManualModal] = useState(false)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [successBanner, setSuccessBanner] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!city.trim()) return
    setSearching(true)
    setSearchError('')
    setResults([])
    const params = new URLSearchParams({ raw: '1', location: city.trim(), category })
    const res = await fetch(`/api/search?${params.toString()}`)
    const data = await res.json()
    if (!res.ok) {
      setSearchError(data.error ?? 'Search failed')
    } else {
      setResults(data.businesses ?? [])
    }
    setSearching(false)
  }

  function handleSent(contact: CampaignContact) {
    const key = contact.yelp_id ?? `${contact.business_name}:${contact.phone}`
    setSentIds((prev) => new Set([...prev, key]))
    setSuccessBanner(`Campaign sent to ${contact.business_name}!`)
    setTimeout(() => setSuccessBanner(''), 4000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Campaign</h3>
          <p className="text-sm text-slate-500 mt-0.5">Search Yelp for pros and send them an SMS or email to join QuickProList.</p>
        </div>
        <button
          onClick={() => setShowManualModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
        >
          + Add Manually
        </button>
      </div>

      {successBanner && (
        <div className="bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 rounded-xl px-4 py-3 text-sm font-medium">
          {successBanner}
        </div>
      )}

      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl ring-1 ring-slate-200 p-3 flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City (e.g. Atlanta, GA)"
          className="flex-1 rounded-xl ring-1 ring-slate-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white text-sm"
        >
          {CATEGORIES.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={searching || !city.trim()}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {searchError && <p className="text-sm text-rose-600">{searchError}</p>}

      {results.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wide">
            <div>Business</div>
            <div>Phone</div>
            <div></div>
          </div>
          {results.map((b) => {
            const sentKey = b.id ?? `${b.name}:${b.phone}`
            const alreadySent = sentIds.has(sentKey)
            const hasPhone = !!b.phone?.trim()
            return (
              <div key={b.id ?? b.name} className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-b border-slate-100 last:border-b-0 items-center">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{b.name}</p>
                  {b.address && <p className="text-xs text-slate-500 mt-0.5">{b.address}</p>}
                </div>
                <div className="text-sm text-slate-700 whitespace-nowrap">
                  {hasPhone ? b.phone : <span className="text-slate-400 italic">No phone</span>}
                </div>
                <div>
                  {alreadySent ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      ✓ Sent
                    </span>
                  ) : (
                    <button
                      disabled={!hasPhone}
                      onClick={() =>
                        setSendTarget({
                          name: b.name,
                          phone: b.phone ?? '',
                          yelpId: b.id,
                          category: b.category ?? category,
                          city: city.trim(),
                        })
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:bg-slate-100 disabled:text-slate-400 transition-colors"
                    >
                      Send SMS
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {results.length === 0 && !searching && !searchError && (
        <div className="text-center py-12 bg-white rounded-2xl ring-1 ring-slate-200">
          <p className="text-3xl mb-2">📱</p>
          <p className="text-slate-700 font-medium">Search for pros above</p>
          <p className="text-sm text-slate-500 mt-1">or use &quot;Add Manually&quot; to send SMS or email to a specific business</p>
        </div>
      )}

      {sendTarget && (
        <SendModal
          business={sendTarget}
          onClose={() => setSendTarget(null)}
          onSent={(contact) => {
            handleSent(contact)
            setSendTarget(null)
          }}
        />
      )}

      {showManualModal && (
        <ManualSendModal
          onClose={() => setShowManualModal(false)}
          onSent={(contact) => {
            handleSent(contact)
            setShowManualModal(false)
          }}
        />
      )}
    </div>
  )
}
