'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const ITEMS = [
  { href: '/admin', label: 'Pinned Pros', match: 'pros' },
  { href: '/admin?tab=invitations', label: 'Invitations', match: 'invitations' },
  { href: '/admin?tab=reports', label: 'Reports', match: 'reports' },
  { href: '/admin?tab=requests', label: 'Requests', match: 'requests' },
  { href: '/admin/campaigns', label: 'Campaigns', match: 'campaigns' },
] as const

export default function AdminSidebar() {
  const path = usePathname()
  const tab = useSearchParams().get('tab')
  const current = path.startsWith('/admin/campaigns')
    ? 'campaigns'
    : tab === 'invitations' || tab === 'reports' || tab === 'requests'
      ? tab
      : 'pros'

  return (
    <aside className="sm:w-48 shrink-0">
      <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Admin</p>
      <nav className="flex sm:flex-col gap-1 overflow-x-auto">
        {ITEMS.map((item) => {
          const active = current === item.match
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
