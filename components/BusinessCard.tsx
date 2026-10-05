import Image from 'next/image'
import type { Business } from '@/lib/business'
import { formatPhoneDisplay, phoneTelHref } from '@/lib/phone'
import TrackedContactLink from '@/components/TrackedContactLink'

interface Props {
  business: Business
  isFeatured?: boolean
  highlighted?: boolean
}

export default function BusinessCard({ business, isFeatured, highlighted = false }: Props) {
  const highlight = isFeatured ?? true
  const ringClass = highlighted
    ? 'ring-2 ring-amber-500 shadow-[0_0_0_2px_rgba(245,158,11,0.35),0_10px_36px_rgba(245,158,11,0.28)]'
    : highlight
    ? 'ring-2 ring-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_8px_28px_rgba(245,158,11,0.18)]'
    : 'ring-1 ring-gray-200/80'
  return (
    <article
      className={`group relative bg-white rounded-2xl overflow-hidden flex flex-col sm:flex-row transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(15,23,42,0.06)] ${ringClass}`}
    >
      <div className="relative w-full sm:w-44 h-36 sm:h-auto flex-shrink-0 overflow-hidden bg-gray-100">
        {business.imageUrl ? (
          <Image
            src={business.imageUrl}
            alt={business.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, 176px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center">
            <span className="text-4xl">🏠</span>
          </div>
        )}
        {highlight && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shadow">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
              <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.6l-5.9 3.08 1.13-6.58L2.45 9.44l6.6-.96L12 2.5z" />
            </svg>
            Featured
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 text-[15px] leading-tight truncate">
              {business.name}
            </h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {business.categories.slice(0, 2).map((c) => (
                <span
                  key={c}
                  className="text-[11px] font-medium bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full ring-1 ring-slate-200/70 truncate max-w-[140px]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {business.address && (
          <p className="text-sm text-gray-600 truncate flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {business.address}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-center gap-2 flex-wrap">
          {business.phone && (
            <TrackedContactLink
              businessId={business.id}
              clickType="phone"
              href={phoneTelHref(business.phone)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 px-3 py-1.5 rounded-full transition-colors max-w-full truncate"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
              </svg>
              {formatPhoneDisplay(business.phone)}
            </TrackedContactLink>
          )}
          {business.websiteUrl && (
            <TrackedContactLink
              businessId={business.id}
              clickType="website"
              href={business.websiteUrl.startsWith('http') ? business.websiteUrl : `https://${business.websiteUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Visit website"
              className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </TrackedContactLink>
          )}
          {business.proSiteEnabled && (
            <a
              href={`/pro/${business.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 ring-1 ring-violet-200 px-3 py-1.5 rounded-full transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
              ProSite
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
