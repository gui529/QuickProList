'use client'

import { useState } from 'react'
import { CATEGORIES } from '@/lib/categories'
import { DEFAULT_MESSAGE } from '@/lib/campaigns'
import type { CampaignContact } from '@/lib/campaigns'

type Channel = 'sms' | 'email'

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
  const [showManualModal, setShowManualModal] = useState(false)
  const [successBanner, setSuccessBanner] = useState('')

  function handleSent(contact: CampaignContact) {
    setSuccessBanner(`Campaign sent to ${contact.business_name}!`)
    setTimeout(() => setSuccessBanner(''), 4000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Campaign</h3>
          <p className="text-sm text-slate-500 mt-0.5">Send a pro an SMS or email inviting them to join QuickProList.</p>
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

      <div className="text-center py-12 bg-white rounded-2xl ring-1 ring-slate-200">
        <p className="text-3xl mb-2">📱</p>
        <p className="text-slate-700 font-medium">Reach out to a pro</p>
        <p className="text-sm text-slate-500 mt-1">Use &quot;Add Manually&quot; to send an SMS or email to a specific business</p>
      </div>

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
