'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginForm({ initialError = null }: { initialError?: string | null }) {
  const [pending, setPending] = useState(false)

  async function handleGoogle() {
    setPending(true)
    try {
      await signIn('google', { redirectTo: '/admin' })
    } finally {
      setPending(false)
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
            <p className="text-xs text-slate-500">Use your Google account.</p>
          </div>
        </div>

        {initialError && (
          <p role="alert" className="mb-4 rounded-xl bg-rose-50 ring-1 ring-rose-200 p-3 text-sm text-rose-800">
            {initialError}
          </p>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={pending}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {pending ? 'Redirecting…' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
}
