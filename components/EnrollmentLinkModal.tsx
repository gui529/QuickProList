'use client'

import { useState, useEffect } from 'react'
import type { Business } from '@/lib/business'
import { CATEGORIES } from '@/lib/categories'
import CityMultiSelect from './CityMultiSelect'

interface Props {
  open: boolean
  onClose: () => void
  business: Business
  defaultCategory: string
}

export default function EnrollmentLinkModal({ open, onClose, business, defaultCategory }: Props) {
  const [cities, setCities] = useState<string[]>(business.cities || [])
  const [monthlyPrice, setMonthlyPrice] = useState(29.99)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  if (!open) return null

  async function handleGenerate() {
    if (cities.length === 0) {
      setError('Please select at least one city')
      return
    }

    setLoading(true)
    setError('')
    setToken('')
    setUrl('')

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: business.name,
          category: business.category || defaultCategory,
          cities,
          monthlyPrice,
          yelpId: business.yelpId,
          yelpData: business.source === 'yelp' ? business : null,
          // Manual businesses only ever exist as curated rows (never as a
          // live, not-yet-pinned search result), so `business.id` here is
          // always the pre-existing curated_businesses id — pass it through
          // so the webhook updates that row instead of inserting a
          // duplicate bare one on checkout completion.
          existingCuratedId: business.source === 'manual' ? business.id : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate link')
        setLoading(false)
        return
      }

      const newToken = data.token
      const newUrl = `${window.location.origin}/enroll/${newToken}`
      setToken(newToken)
      setUrl(newUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }

    setLoading(false)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }

  const categoryLabel = CATEGORIES.find((c) => c.value === (business.category || defaultCategory))?.label

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900">Create enrollment link</h3>
            <p className="text-xs text-slate-500 mt-0.5">Send to {business.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {token ? (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs text-emerald-700 font-semibold uppercase mb-2">Link created</p>
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-lg ring-1 ring-emerald-300 px-3 py-2.5 text-sm text-emerald-900 bg-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Preview
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17 17 7" />
                    <path d="M8 7h9v9" />
                  </svg>
                </a>
                <button
                  onClick={handleCopy}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
                >
                  {copied ? '✓ Copied' : 'Copy link'}
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium text-sm"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cities</label>
                <CityMultiSelect value={cities} onChange={setCities} />
                <p className="text-xs text-slate-500 mt-1">Select at least one city for this business</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Monthly price</label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium text-slate-600">$</span>
                  <input
                    type="number"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(Math.max(0.99, parseFloat(e.target.value) || 29.99))}
                    step="0.01"
                    min="0.99"
                    className="flex-1 rounded-lg ring-1 ring-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  />
                  <span className="text-slate-600 font-medium">/month</span>
                </div>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <p className="text-rose-800 text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-sm"
                >
                  {loading ? 'Generating…' : 'Generate link'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
