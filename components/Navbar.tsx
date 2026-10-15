'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLogo } from '@/components/brand/BrandLogo'

export default function Navbar() {
  const path = usePathname()

  const links = [
    { href: '/', label: 'Search' },
    { href: '/admin', label: 'Admin' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" aria-label="QuickProList home">
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = path === href
            return (
              <Link
                key={label}
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
