'use client'

import { useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/browser'

export default function LoginForm({ initialError = null }: { initialError?: string | null }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const bounceError = status === 'idle' ? initialError : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setError('')
    const supabase = getBrowserSupabase()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setStatus('error')
      setError(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="flex items-center justify-center pt-20">
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-7 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-5">
          <span className="grid place-items-center h-10 w-10 rounded-xl bg-slate-900 text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 1 1 10 0v4" />
            </svg>
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Admin sign in</h2>
            <p className="text-xs text-slate-500">We&apos;ll email you a one-click link.</p>
          </div>
        </div>

        {bounceError && (
          <p role="alert" className="mb-4 rounded-xl bg-rose-50 ring-1 ring-rose-200 p-3 text-sm text-rose-800">
            {bounceError}
          </p>
        )}

        {status === 'sent' ? (
          <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-4 text-sm text-emerald-900">
            <p className="font-semibold">Check your email.</p>
            <p className="mt-1">A magic link has been sent to <span className="font-medium">{email}</span>. Click it to finish signing in.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl ring-1 ring-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
