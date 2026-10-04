import Image from 'next/image'
import type { Business } from '@/lib/yelp'
import TrackedContactLink from '@/components/TrackedContactLink'
import { contactInitials, ratingSuffix } from '@/components/contactList'

interface Props {
  business: Business
  /** Sentence-case trade for the secondary line, e.g. "Plumber". */
  trade?: string
  highlighted?: boolean
  /** Draw the hairline under the row. Omit on the last row in a group. */
  separator?: boolean
}

const callClass =
  'inline-flex items-center justify-center h-11 px-4 rounded-[10px] bg-[#007AFF] text-white text-[17px] font-semibold leading-[22px] shrink-0'

export default function BusinessCard({ business, trade, highlighted = false, separator = false }: Props) {
  const isCurated = business.source === 'manual' || !!business.yelpId
  const initials = contactInitials(business.name)
  const secondary = `${trade ?? ''}${ratingSuffix(business)}`

  const call = business.phone ? (
    isCurated ? (
      <TrackedContactLink
        businessId={business.id}
        clickType="phone"
        href={`tel:${business.phone}`}
        aria-label={`Call ${business.phone}`}
        className={callClass}
      >
        Call
      </TrackedContactLink>
    ) : (
      <a href={`tel:${business.phone}`} aria-label={`Call ${business.phone}`} className={callClass}>
        Call
      </a>
    )
  ) : null

  return (
    <article className="relative flex items-center gap-3 min-h-16 px-4 bg-white">
      {business.imageUrl ? (
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#E5E5EA]">
          <Image src={business.imageUrl} alt="" fill className="object-cover" sizes="36px" />
        </span>
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E5E5EA] text-[15px] font-semibold text-[rgba(60,60,67,0.6)]">
          {initials}
        </span>
      )}

      <div className="min-w-0 flex-1 py-2">
        {business.proSiteEnabled ? (
          <a href={`/pro/${business.id}`} className="block truncate text-[17px] font-semibold leading-[22px] text-black">
            {business.name}
          </a>
        ) : (
          <p className="truncate text-[17px] font-semibold leading-[22px] text-black">{business.name}</p>
        )}
        {(secondary || highlighted) && (
          <p className="truncate text-[15px] leading-5 text-[rgba(60,60,67,0.6)]">
            {secondary}
            {highlighted && <span className="text-[#007AFF]"> · Your listing</span>}
          </p>
        )}
      </div>

      {business.proSiteEnabled && (
        <a
          href={`/pro/${business.id}`}
          aria-label={`Open ${business.name}`}
          className="grid h-11 w-11 shrink-0 place-items-center text-[#C7C7CC]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </a>
      )}

      {call}

      {separator && (
        <span className="pointer-events-none absolute bottom-0 left-16 right-0 h-px bg-[rgba(60,60,67,0.29)]" />
      )}
    </article>
  )
}
