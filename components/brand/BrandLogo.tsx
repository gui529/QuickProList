import { BrandMark } from './BrandMark'

/** Navbar wordmark + icon. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <BrandMark size={32} className="shadow-sm ring-1 ring-black/5 rounded-lg" />
      <span className="text-[17px] font-semibold tracking-tight text-slate-900">
        Quick<span className="text-amber-500">ProList</span>
      </span>
    </span>
  )
}
