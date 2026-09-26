'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  reset?: () => void
  unstable_retry?: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  // Next.js 16.2+ passes `unstable_retry`, which re-fetches and re-renders
  // the segment instead of just clearing error state (see
  // node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md,
  // "Version History": `unstable_retry` prop added in v16.2.0). Fall back to
  // `reset` for compatibility if it's ever not provided.
  const retry = unstable_retry ?? reset

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-24">
      <span className="text-5xl">⚠️</span>
      <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-md">
        An unexpected error occurred. You can try again, or head back to the homepage.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => retry?.()}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white text-sm font-medium px-5 py-2.5 shadow-sm hover:bg-slate-800 transition cursor-pointer"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 ring-1 ring-slate-200 text-slate-700 text-sm font-medium px-5 py-2.5 hover:bg-white transition"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
