import { SPONSORED_BADGE } from '@/lib/sponsored'

/** Visible tag. Normal text size, dark-on-amber, not a tooltip. */
export default function SponsoredBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center text-[15px] font-semibold leading-tight text-amber-950 bg-amber-100 ring-1 ring-amber-700 px-2 py-0.5 rounded-md ${className}`}
    >
      {SPONSORED_BADGE}
    </span>
  )
}
