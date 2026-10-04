'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function isHomeownerPath(path: string): boolean {
  return path === '/' || path.startsWith('/pro/')
}

export default function HomeownerShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  if (isHomeownerPath(path)) {
    return (
      <div className="homeowner flex-1 flex flex-col min-h-full w-full">
        <main className="w-full flex-1">{children}</main>
      </div>
    )
  }

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1 overflow-x-hidden">
        {children}
      </main>
      <footer className="border-t border-gray-200/70 bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:h-14 sm:py-0 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] sm:text-xs text-gray-500">
          <span>© {new Date().getFullYear()} QuickProList</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
            <span>Powered by Yelp Fusion</span>
          </div>
        </div>
      </footer>
    </>
  )
}
