'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isHomeownerPath } from '@/components/HomeownerShell'

function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm ring-1 ring-black/5">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-5h4v5" />
        </svg>
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-slate-900">
        Quick<span className="text-amber-500">ProList</span>
      </span>
    </span>
  )
}

export default function Navbar() {
  const path = usePathname()
  if (isHomeownerPath(path)) return null

  const links = [
    { href: '/', label: 'Search' },
    { href: '/admin', label: 'Admin' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" aria-label="QuickProList home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = path === href
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  active
                    ? 'text-slate-900'
                    : 'text-gray-500 hover:text-slate-900'
                }`}
              >
                {label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-amber-500" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
