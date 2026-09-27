'use client'

import { useState } from 'react'

interface Props {
  token: string
  initialWebsiteUrl: string
  initialContactEmail: string
  initialReviewUrl: string
}

/**
 * Self-serve edit form on `/dashboard/[token]` — lets a subscribed business
 * update its own website URL, contact email, and review link without
 * emailing an admin. Deliberately excludes name/category/cities/pricing,
 * which stay admin-controlled via `/admin`. Saves via
 * `PATCH /api/dashboard/[token]`, gated by nothing but the token itself
 * (there's no separate login for businesses).
 */
export default function DashboardEditForm({
  token,
  initialWebsiteUrl,
  initialContactEmail,
  initialReviewUrl,
}: Props) {
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl)
  const [contactEmail, setContactEmail] = useState(initialContactEmail)
  const [reviewUrl, setReviewUrl] = useState(initialReviewUrl)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await fetch(`/api/dashboard/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl, contactEmail, reviewUrl }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to save')
        return
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-10 bg-white rounded-2xl ring-1 ring-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Edit your listing</h2>
      <p className="text-sm text-slate-500 mb-5">
        Update your website, contact email, and review link. Other details (name, category, cities) are
        managed by QuickProList — reach out if those need to change.
      </p>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-700">Website URL</span>
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://"
            className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-700">Contact email</span>
          <input
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-700">Review link</span>
          <input
            value={reviewUrl}
            onChange={(e) => setReviewUrl(e.target.value)}
            placeholder="https://g.page/r/.../review"
            className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5"
          />
          <p className="text-xs text-slate-500">Link customers use to leave you a review.</p>
        </label>
      </div>

      {error && <p className="text-sm text-rose-600 mt-4">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-600 mt-4">Saved.</p>}

      <div className="flex justify-end mt-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </section>
  )
}
