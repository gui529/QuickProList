import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import SiteNav from '@/components/SiteNav'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'QuickProList — Find Local Home Services',
  description: 'Search for local plumbers, electricians, HVAC, and more in your area.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fafaf8',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SiteNav />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1 overflow-x-hidden">{children}</main>
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
