'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import EnrollListingPreview from '@/components/EnrollListingPreview'
import { CATEGORIES, normalizeCategory } from '@/lib/categories'
import { formatCityLabel } from '@/lib/display'
import { reminderEmailError } from '@/lib/reminder-email'
import {
  cancelSubscriptionMailto,
  SUBSCRIPTION_CONSENT_REQUIRED_ERROR,
  subscriptionDisclosureText,
  subscriptionSuccessLine,
} from '@/lib/subscription-terms'
import { buildEnrollHomeUrl } from '@/lib/enroll-home-url'
import { saveMyListingId } from '@/lib/my-listing-storage'
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
  proDashboardEnabled?: boolean
  initialContactEmail?: string | null
}

export default function EnrollClient({
  invitation,
  token,
  dashboardToken,
  proDashboardEnabled = false,
  initialContactEmail = null,
}: Props) {
  const [wantSubscribe] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('subscribe') === '1'
  })
  const [step, setStep] = useState<'preview' | 'checkout'>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('subscribe') === '1') {
      return 'checkout'
    }
    if (invitation.curated_business_id && invitation.status === 'pending') return 'checkout'
    return 'preview'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [contactEmail, setContactEmail] = useState(initialContactEmail ?? '')
  const [subscriptionConsent, setSubscriptionConsent] = useState(false)
  const [localDashboardToken, setLocalDashboardToken] = useState<string | null>(dashboardToken ?? null)

  const [success] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('success') === '1'
  })

  const categoryLabel = CATEGORIES.find((c) => c.value === invitation.category)?.label || invitation.category
  const effectiveDashboardToken =
    proDashboardEnabled ? (localDashboardToken ?? dashboardToken ?? null) : null
  useEffect(() => {
    if (wantSubscribe || invitation.status !== 'trial' || success) return
    window.location.replace(
      buildEnrollHomeUrl(invitation, invitation.curated_business_id)
    )
  }, [invitation, success, wantSubscribe])

  async function handleStartPreview() {
    const emailError = reminderEmailError(contactEmail)
    if (emailError) {
      setError(emailError)
      return
    }
    const email = contactEmail.trim()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/enroll/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to start preview')
        setLoading(false)
        return
      }
      if (data.curatedBusinessId) saveMyListingId(data.curatedBusinessId)
      window.location.href = buildEnrollHomeUrl(invitation, data.curatedBusinessId)
      return
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
    setLoading(false)
  }

  async function handleSubscribe() {
    if (!subscriptionConsent) {
      setError(SUBSCRIPTION_CONSENT_REQUIRED_ERROR)
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, consent: true }),
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
            {subscriptionSuccessLine(
              invitation.business_name,
              categoryLabel,
              invitation.cities.map((city) => formatCityLabel(city)).join(', ')
            )}
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

  if (invitation.status === 'trial' && step !== 'checkout' && !wantSubscribe) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <p className="text-slate-600">Taking you to QuickProList…</p>
      </div>
    )
  }

  const searchCity = invitation.cities[0]
  const searchHref = searchCity
    ? `/?location=${encodeURIComponent(searchCity)}&category=${encodeURIComponent(normalizeCategory(invitation.category))}`
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

            <div className="mt-6 flex flex-col gap-1">
              <label htmlFor="preview-reminder-email" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Email for preview reminders
              </label>
              <input
                id="preview-reminder-email"
                type="email"
                required
                autoComplete="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                aria-invalid={error.toLowerCase().includes('email') ? true : undefined}
                className="rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <p className="text-xs text-slate-500">Used for preview reminders and win-back — not shown on your listing.</p>
            </div>

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
            </div>
          </div>

          <div className="mb-6 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4 text-sm text-slate-700">
            <p>{subscriptionDisclosureText()}</p>
            <a
              href={cancelSubscriptionMailto(invitation.business_name, contactEmail)}
              className="inline-block mt-2 underline hover:text-slate-900"
            >
              Email to cancel
            </a>
            <label htmlFor="subscription-consent" className="mt-4 flex items-start gap-2 text-sm text-slate-800">
              <input
                id="subscription-consent"
                type="checkbox"
                className="mt-1"
                checked={subscriptionConsent}
                onChange={(e) => setSubscriptionConsent(e.target.checked)}
              />
              <span>I agree to these subscription terms.</span>
            </label>
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
            disabled={loading || invitation.status === 'paid' || !subscriptionConsent}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Processing…' : invitation.status === 'paid' ? 'Already Enrolled' : 'Go to secure checkout'}
          </button>

          <p className="text-center text-xs text-slate-500 mt-6">
            By subscribing, you agree to be listed in QuickProList search results for the selected cities,
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
