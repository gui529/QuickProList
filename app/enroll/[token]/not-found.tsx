import Link from 'next/link'
import { legalContactMailto } from '@/lib/legal-site'

export default function EnrollNotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Link not found</h1>
        <p className="text-slate-600">
          This enrollment link is invalid or has expired. Please contact us if you believe this is a mistake.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white text-sm font-medium px-5 py-2.5 shadow-sm hover:bg-slate-800 transition"
          >
            Back to home
          </Link>
          <a
            href={legalContactMailto}
            className="inline-flex items-center gap-1.5 rounded-full bg-white ring-1 ring-slate-200 text-slate-700 text-sm font-medium px-5 py-2.5 hover:bg-slate-50 transition"
          >
            Contact us
          </a>
        </div>
      </div>
    </div>
  )
}
