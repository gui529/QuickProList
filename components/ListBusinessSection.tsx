'use client'

import { useState } from 'react'
import { CATEGORIES } from '@/lib/categories'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function ListBusinessSection() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [zip, setZip] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    const res = await fetch('/api/list-business', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName, contactName, email, phone, category, zip, message,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data.error ?? 'Could not submit. Try again.')
      setStatus('error')
      return
    }

    setStatus('success')
    setBusinessName(''); setContactName(''); setEmail(''); setPhone(''); setZip(''); setMessage('')
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 ring-1 ring-slate-800 px-6 py-10 sm:px-10 sm:py-12">
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

        <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-[11px] font-medium text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              For pros
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Run a home-services business?<br />
              <span className="text-amber-300">Get listed on QuickProList.</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-md">
              Reach neighbors actively looking for help with home projects. Free to apply — we&apos;ll review and reach out.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-200">
              {[
                'Featured placement in search results',
                'No long-term contracts',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 text-amber-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>

            {!open && status !== 'success' && (
              <button
                onClick={() => setOpen(true)}
                className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-semibold px-5 py-3 transition-colors"
              >
                Apply to be listed
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          <div className="md:pl-4">
            {status === 'success' ? (
              <div className="rounded-2xl bg-white p-6 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 grid place-items-center">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-900">Application received</p>
                <p className="mt-1 text-sm text-slate-500">We&apos;ll be in touch at <span className="font-medium text-slate-700">{email || 'your email'}</span> shortly.</p>
                <button
                  onClick={() => { setStatus('idle'); setOpen(false) }}
                  className="mt-4 text-sm font-medium text-amber-700 hover:text-amber-800"
                >
                  Submit another →
                </button>
              </div>
            ) : open ? (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl bg-white p-5 sm:p-6 shadow-xl ring-1 ring-black/5 grid gap-3"
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Business name" required>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Your name" required>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Email" required>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Category" required>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={inputCls}
                      required
                    >
                      {CATEGORIES.map(({ label, value }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="ZIP" required>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      required
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Field label="About your business">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className={`${inputCls} resize-none`}
                    placeholder="What do you specialize in?"
                  />
                </Field>

                {errorMsg && (
                  <p className="text-sm text-rose-600">{errorMsg}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold px-5 py-3 transition-colors"
                  >
                    {status === 'submitting' ? 'Submitting…' : 'Submit application'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl text-slate-600 hover:text-slate-900 text-sm font-medium px-3 py-3"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="hidden md:flex flex-col gap-3">
                {[
                  { icon: '📈', title: 'More qualified leads', body: 'Reach customers ready to book.' },
                  { icon: '⭐', title: 'Stand out in search', body: 'Featured listings are marked as featured.' },
                ].map((c) => (
                  <div key={c.title} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                    <div className="text-xl">{c.icon}</div>
                    <p className="mt-1 text-sm font-semibold text-white">{c.title}</p>
                    <p className="text-xs text-slate-300">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

const inputCls =
  'w-full rounded-xl bg-white ring-1 ring-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  )
}
