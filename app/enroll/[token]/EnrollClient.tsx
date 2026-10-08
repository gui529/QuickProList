'use client'

import { useState } from 'react'
import Link from 'next/link'
import EnrollListingPreview from '@/components/EnrollListingPreview'
import { CATEGORIES } from '@/lib/categories'
import type { EnrollmentInvitation } from '@/lib/invitations'

interface Props {
  invitation: EnrollmentInvitation
  token: string
  /**
   * The business's `curated_businesses.dashboard_token`, when known — used
   * to show a direct dashboard link on the success view as a redundant path
   * alongside the welcome email (email delivery isn't guaranteed: spam
   * filters, mistyped addresses, etc). `null` when the business hasn't been
   * linked to a curated row yet, in which case no link is rendered. See #41.
   */
  dashboardToken?: string | null
}

function formatTrialEnd(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function EnrollClient({ invitation, token, dashboardToken }: Props) {
  const [step, setStep] = useState<'preview' | 'checkout'>('preview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [trialStarted, setTrialStarted] = useState(false)
  const [localDashboardToken, setLocalDashboardToken] = useState<string | null>(dashboardToken ?? null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(invitation.trial_ends_at)

  const [success] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('success') === '1'
  })

  const categoryLabel = CATEGORIES.find((c) => c.value === invitation.category)?.label || invitation.category
  const effectiveDashboardToken = localDashboardToken ?? dashboardToken ?? null
  const onTrial = (invitation.status === 'trial' || trialStarted) && step !== 'checkout'

  async function handleStartPreview() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/enroll/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to start preview')
        setLoading(false)
        return
      }
      setTrialStarted(true)
      setTrialEndsAt(data.trialEndsAt ?? null)
      if (data.dashboardToken) setLocalDashboardToken(data.dashboardToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
    setLoading(false)
  }

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
          {effectiveDashboardToken && (
            <Link
              href={`/dashboard/${effectiveDashboardToken}`}
              className="inline-block mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              View your dashboard
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (onTrial) {
    const endLabel = trialEndsAt ? formatTrialEnd(trialEndsAt) : 'soon'
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-emerald-50 to-emerald-100 px-4">
        <div className="text-center max-w-lg">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-4xl font-bold text-emerald-900 mb-2">You&apos;re live on QuickProList</h1>
          <p className="text-emerald-700 mb-4">
            {invitation.business_name} is pinned in search for {invitation.cities.join(', ')} through{' '}
            <strong>{endLabel}</strong> — your free preview window.
          </p>
          <p className="text-sm text-emerald-600 mb-6">
            When you&apos;re ready, you can subscribe at ${invitation.monthly_price.toFixed(2)}/month to stay listed
            after the preview.
          </p>
          {effectiveDashboardToken && (
            <Link
              href={`/dashboard/${effectiveDashboardToken}`}
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              View your dashboard
            </Link>
          )}
          <button
            type="button"
            onClick={() => setStep('checkout')}
            className="block w-full mt-4 text-sm text-emerald-800 underline hover:text-emerald-950"
          >
            Subscribe now — skip waiting until preview ends
          </button>
        </div>
      </div>
    )
  }

  const searchCity = invitation.cities[0]
  const searchHref =
    searchCity
      ? `/search?location=${encodeURIComponent(searchCity)}&category=${encodeURIComponent(invitation.category)}`
      : null

  if (step === 'preview' && invitation.status !== 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-3xl shadow-lg ring-1 ring-slate-200 p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Your listing preview</h1>
              <p className="text-slate-600 text-sm">
                Not live yet — this is how your pinned profile can look on QuickProList.
              </p>
            </div>

            <EnrollListingPreview
              businessName={invitation.business_name}
              category={invitation.category}
              cities={invitation.cities}
            />

            {searchHref && (
              <p className="text-center mt-4">
                <Link href={searchHref} className="text-sm text-slate-600 underline hover:text-slate-900">
                  See current {categoryLabel} results in {searchCity}
                </Link>
              </p>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mt-6 text-center">
                <p className="text-rose-800 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleStartPreview}
              disabled={loading}
              className="w-full mt-8 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Starting preview…' : 'Yes — start my 30-day preview'}
            </button>

            <button
              type="button"
              onClick={() => setStep('checkout')}
              className="w-full mt-3 text-sm text-slate-600 hover:text-slate-900 underline"
            >
              I&apos;d rather subscribe now (${invitation.monthly_price.toFixed(2)}/mo)
            </button>

            <p className="text-center text-xs text-slate-500 mt-4">
              No card required for the preview. Your listing goes live in search for 30 days; subscribe anytime to
              stay on after that.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl shadow-lg ring-1 ring-slate-200 p-8">
          {invitation.status !== 'paid' && (
            <button
              type="button"
              onClick={() => setStep('preview')}
              className="text-sm text-slate-500 hover:text-slate-800 mb-4"
            >
              ← Back to preview
            </button>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Subscribe to stay listed</h1>
            <p className="text-slate-600">{invitation.business_name}</p>
          </div>

          <div className="space-y-6 mb-8">
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
            {loading ? 'Processing…' : invitation.status === 'paid' ? 'Already Enrolled' : 'Go to secure checkout'}
          </button>

          <p className="text-center text-xs text-slate-500 mt-6">
            By subscribing, you agree to be featured in QuickProList search results for the selected cities,
            and to our{' '}
            <Link href="/terms" className="underline hover:text-slate-700">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-slate-700">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
