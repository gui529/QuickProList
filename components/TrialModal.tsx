'use client'

import { useState } from 'react'
import type { Business } from '@/lib/yelp'

interface Props {
  business: Business
  defaultCategory: string
  defaultCities: string[]
  onClose: () => void
  onSaved: () => void
}

export default function TrialModal({ business, defaultCategory, defaultCities, onClose, onSaved }: Props) {
  const [trialType, setTrialType] = useState<'unlimited' | 'limited'>('unlimited')
  const [days, setDays] = useState(30)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [now] = useState(() => Date.now())

  async function handleStart() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isTrial: true,
        businessName: business.name,
        category: defaultCategory,
        cities: defaultCities,
        trialDays: trialType === 'limited' ? days : null,
        // For existing manual businesses, pass the UUID so the API updates instead of inserting
        // Yelp businesses use upsert on yelp_id so they don't need this
        existingCuratedId: business.source === 'manual' ? business.id : undefined,
        yelpId: business.source === 'yelp' ? (business.yelpId ?? business.id) : undefined,
        yelpData: business.source === 'yelp' ? business : undefined,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to start trial')
      return
    }
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Start free trial</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <p className="font-medium text-slate-900 truncate">{business.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{defaultCategory} · {defaultCities.slice(0, 2).join(', ')}{defaultCities.length > 2 ? ` +${defaultCities.length - 2}` : ''}</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 p-3 rounded-xl ring-1 ring-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="trialType"
                checked={trialType === 'unlimited'}
                onChange={() => setTrialType('unlimited')}
                className="accent-slate-900"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">Unlimited trial</p>
                <p className="text-xs text-slate-500">Pro stays in results indefinitely</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl ring-1 ring-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="trialType"
                checked={trialType === 'limited'}
                onChange={() => setTrialType('limited')}
                className="accent-slate-900"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">Limited trial</p>
                <p className="text-xs text-slate-500">Auto-expires after a set number of days</p>
              </div>
            </label>
          </div>

          {trialType === 'limited' && (
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 rounded-xl ring-1 ring-slate-200 px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-sm text-slate-600">days</span>
              <span className="text-xs text-slate-400">
                Expires {new Date(now + days * 864e5).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-sm">
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
            >
              {saving ? 'Starting…' : 'Start trial'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
