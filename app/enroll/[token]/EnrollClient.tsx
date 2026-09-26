'use client'

import { useState } from 'react'
import { CATEGORIES } from '@/lib/categories'
import type { EnrollmentInvitation } from '@/lib/invitations'

interface Props {
  invitation: EnrollmentInvitation
  token: string
}

export default function EnrollClient({ invitation, token }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('success') === '1'
  })

  const categoryLabel = CATEGORIES.find((c) => c.value === invitation.category)?.label || invitation.category

  async function handleSubscribe() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create checkout')
        setLoading(false)
        return
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-emerald-50 to-emerald-100 px-4">
        <div className="text-center max-w-lg">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-4xl font-bold text-emerald-900 mb-2">Payment successful!</h1>
          <p className="text-emerald-700 mb-6">
            {invitation.business_name} is now featured on QuickProList. Customers searching for {categoryLabel} in{' '}
            {invitation.cities.join(', ')} will see your business first.
          </p>
          <p className="text-sm text-emerald-600">
            Your monthly subscription of ${invitation.monthly_price.toFixed(2)}/month is now active.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl shadow-lg ring-1 ring-slate-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Get Featured</h1>
            <p className="text-slate-600">Join QuickProList&apos;s verified pro network</p>
          </div>

          <div className="space-y-6 mb-8">
            <div className="bg-slate-50 rounded-2xl p-6 border-2 border-amber-200">
              <p className="text-sm text-slate-600 mb-1">Business</p>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">{invitation.business_name}</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Category</p>
                  <p className="text-slate-900 font-medium">{categoryLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Cities</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {invitation.cities.map((city) => (
                      <span
                        key={city}
                        className="inline-block bg-amber-50 text-amber-800 text-sm font-medium px-3 py-1 rounded-full ring-1 ring-amber-200"
                      >
                        {city}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-slate-600 font-medium">Monthly price</span>
                <span className="text-4xl font-bold text-slate-900">
                  ${invitation.monthly_price.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-500">Billed monthly, cancel anytime</p>
            </div>
          </div>

          {invitation.status === 'paid' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-center">
              <p className="text-emerald-800 font-medium">Already enrolled</p>
              <p className="text-sm text-emerald-700">Your subscription is active.</p>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 text-center">
              <p className="text-rose-800 text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading || invitation.status === 'paid'}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Processing…' : invitation.status === 'paid' ? 'Already Enrolled' : 'Subscribe Now'}
          </button>

          <p className="text-center text-xs text-slate-500 mt-6">
            By subscribing, you agree to be featured in QuickProList search results for the selected cities.
          </p>
        </div>
      </div>
    </div>
  )
}
