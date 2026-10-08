import { CATEGORIES } from '@/lib/categories'

interface Props {
  businessName: string
  category: string
  cities: string[]
}

/** Static mock of how the business appears in search (preview only — not live until paid). */
export default function EnrollListingPreview({ businessName, category, cities }: Props) {
  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label ?? category
  const cityLabel = cities[0] ?? 'your area'

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 text-center">
        Preview — how homeowners see featured pros in {cityLabel}
      </p>
      <article
        className="relative bg-white rounded-2xl overflow-hidden flex flex-col sm:flex-row ring-2 ring-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_8px_28px_rgba(245,158,11,0.18)]"
        aria-label="Listing preview"
      >
        <div className="relative w-full sm:w-44 h-36 sm:h-auto flex-shrink-0 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center">
          <span className="text-4xl" aria-hidden>🏠</span>
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shadow">
            Featured
          </span>
        </div>
        <div className="p-4 sm:p-5 flex flex-col gap-2 flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-[15px] leading-tight">{businessName}</h3>
          <span className="text-[11px] font-medium bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full ring-1 ring-slate-200/70 w-fit">
            {categoryLabel}
          </span>
          <p className="text-sm text-slate-500">{cityLabel}</p>
        </div>
      </article>
    </div>
  )
}
