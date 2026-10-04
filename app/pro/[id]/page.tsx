import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getCuratedById, incrementProfileView } from '@/lib/kv'
import { getBusinessById } from '@/lib/yelp'
import type { Business, YelpHourPeriod } from '@/lib/yelp'
import TrackedContactLink from '@/components/TrackedContactLink'
import { contactInitials, ratingSuffix, sentenceTrade } from '@/components/contactList'
import { CATEGORIES } from '@/lib/categories'

export const dynamic = 'force-dynamic'

async function loadBusiness(id: string): Promise<Business | null> {
  let business: Business | null = await getCuratedById(id)
  if (!business) {
    business = await getBusinessById(id).catch(() => null)
  } else if (business.yelpId) {
    const yelpFull = await getBusinessById(business.yelpId).catch(() => null)
    if (yelpFull) {
      business = {
        ...business,
        hours: yelpFull.hours,
        isOpenNow: yelpFull.isOpenNow,
        price: yelpFull.price,
        photos: yelpFull.photos,
      }
    }
  }
  return business
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const business = await loadBusiness(id)
  if (!business || !business.proSiteEnabled) {
    return { title: 'QuickProList' }
  }

  const title = `${business.name} | QuickProList`
  const description = business.address
    ? `${business.name} — local pro serving ${business.address}. View hours, reviews, and contact info on QuickProList.`
    : `${business.name} — local pro on QuickProList. View hours, reviews, and contact info.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: business.imageUrl ? [business.imageUrl] : undefined,
    },
  }
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatTime(t: string): string {
  const h = parseInt(t.slice(0, 2), 10)
  const m = t.slice(2)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function tradeLabel(business: Business): string {
  const match =
    CATEGORIES.find((c) => c.value === business.category) ??
    CATEGORIES.find((c) =>
      business.categories.some(
        (cat) => cat.toLowerCase() === c.term.toLowerCase() || cat.toLowerCase() === c.label.toLowerCase()
      )
    )
  if (match) return sentenceTrade(match.term)
  const raw = business.categories[0]
  return raw ? sentenceTrade(raw) : ''
}

function externalHref(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`
}

function hostOf(url: string): string {
  try {
    return new URL(externalHref(url)).host
  } catch {
    return url.replace(/^https?:\/\//, '')
  }
}

export default async function ProSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const business = await loadBusiness(id)
  if (!business || !business.proSiteEnabled) notFound()

  const biz = business as Business
  void incrementProfileView(biz.id)

  const mapsUrl = biz.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(biz.address)}`
    : null
  const hours: YelpHourPeriod[] = biz.hours ?? []
  const todayYelpDay = (new Date().getDay() + 6) % 7
  const trade = tradeLabel(biz)
  const secondary = `${trade}${ratingSuffix(biz)}`

  type Row = { key: string; label: string; value: ReactNode }
  const rows: Row[] = []

  if (biz.address && mapsUrl) {
    rows.push({
      key: 'address',
      label: 'Address',
      value: (
        <TrackedContactLink
          businessId={biz.id}
          clickType="directions"
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#007AFF]"
        >
          {biz.address}
        </TrackedContactLink>
      ),
    })
  }

  if (biz.websiteUrl) {
    rows.push({
      key: 'website',
      label: 'Website',
      value: (
        <TrackedContactLink
          businessId={biz.id}
          clickType="website"
          href={externalHref(biz.websiteUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#007AFF]"
        >
          {hostOf(biz.websiteUrl)}
        </TrackedContactLink>
      ),
    })
  }

  if (hours.length > 0) {
    DAY_NAMES.forEach((name, dayIdx) => {
      const periods = hours.filter((p) => p.day === dayIdx)
      const isToday = dayIdx === todayYelpDay
      const value = periods.length === 0
        ? 'Closed'
        : periods.map((p) => `${formatTime(p.start)} – ${formatTime(p.end)}`).join(', ')
      rows.push({
        key: name,
        label: name,
        value: (
          <>
            {value}
            {isToday && <span className="text-[rgba(60,60,67,0.6)]"> Today</span>}
          </>
        ),
      })
    })
  }

  if (biz.url) {
    rows.push({
      key: 'reviews',
      label: 'Reviews',
      value: (
        <a href={biz.url} target="_blank" rel="noopener noreferrer" className="text-[#007AFF]">
          On Yelp
        </a>
      ),
    })
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-8 pt-3">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-[17px] leading-[22px] text-[#007AFF]"
      >
        ‹ QuickProList
      </Link>
      <h1 className="text-[34px] font-bold leading-[41px] tracking-[-0.4px] text-black">
        {biz.name}
      </h1>
      {secondary && (
        <p className="mt-1 text-[17px] leading-[22px] text-[rgba(60,60,67,0.6)]">{secondary}</p>
      )}

      {biz.imageUrl ? (
        <span className="relative mt-4 block h-16 w-16 overflow-hidden rounded-full bg-[#E5E5EA]">
          <Image src={biz.imageUrl} alt="" fill className="object-cover" sizes="64px" />
        </span>
      ) : (
        <span className="mt-4 grid h-16 w-16 place-items-center rounded-full bg-[#E5E5EA] text-[17px] font-semibold text-[rgba(60,60,67,0.6)]">
          {contactInitials(biz.name)}
        </span>
      )}

      {biz.phone ? (
        <TrackedContactLink
          businessId={biz.id}
          clickType="phone"
          href={`tel:${biz.phone}`}
          className="mt-4 flex min-h-11 items-center justify-center rounded-[10px] bg-[#007AFF] px-4 text-[17px] font-semibold leading-[22px] text-white"
        >
          {`Call ${biz.phone}`}
        </TrackedContactLink>
      ) : (
        <p className="mt-4 text-[17px] leading-[22px] text-[rgba(60,60,67,0.6)]">No phone number listed.</p>
      )}

      {rows.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-[10px] bg-white">
          {rows.map((row, i) => (
            <div
              key={row.key}
              className={`flex min-h-11 items-center justify-between gap-4 px-4 ${
                i < rows.length - 1 ? 'border-b border-[rgba(60,60,67,0.29)]' : ''
              }`}
            >
              <span className="shrink-0 text-[15px] leading-5 text-[rgba(60,60,67,0.6)]">{row.label}</span>
              <span className="min-w-0 text-right text-[17px] leading-[22px] text-black">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
