import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-24">
      <span className="text-5xl">🧭</span>
      <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-md">
        The page you’re looking for doesn’t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white text-sm font-medium px-5 py-2.5 shadow-sm hover:bg-slate-800 transition"
      >
        Back to home
      </Link>
    </div>
  )
}
