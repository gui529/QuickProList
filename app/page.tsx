'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'
import BusinessCard from '@/components/BusinessCard'
import OpenTownInput from '@/components/OpenTownInput'
import ListBusinessSection from '@/components/ListBusinessSection'
import { sentenceTrade } from '@/components/contactList'
import { NOT_OPEN_MESSAGE, OPEN_TOWNS, resolveOpenTown } from '@/lib/open-towns'
import type { Business } from '@/lib/yelp'

const LOCATION_KEY = 'quickprolist:lastLocation'
const CHOOSE_TOWN = 'Choose your town first — we’ll auto-search once you pick one.'

function loadSavedCity(): string {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (!raw) return ''
    if (raw.startsWith('{')) {
      localStorage.removeItem(LOCATION_KEY)
      return ''
    }
    return resolveOpenTown(raw) ? raw : ''
  } catch {
    return ''
  }
}

function saveCity(city: string) {
  localStorage.setItem(LOCATION_KEY, city)
}

function isHighlighted(b: Business, highlightId?: string): boolean {
  if (!highlightId) return false
  return b.id === highlightId || b.yelpId === highlightId
}

function townName(city: string): string {
  return resolveOpenTown(city)?.name ?? city.trim()
}

/** A prefix of an open town is unfinished. A different city is outside the area. */
function isUnresolvedTown(input: string): boolean {
  const q = input.trim().toLowerCase()
  if (!q) return true
  if (resolveOpenTown(q)) return false
  return OPEN_TOWNS.some((t) => t.slug.startsWith(q) || t.name.toLowerCase().startsWith(q))
}

function HomePageInner() {
  const searchParams = useSearchParams()
  const urlLocation = searchParams.get('location') ?? ''
  const urlCategory = searchParams.get('category') ?? ''
  const urlHighlight = searchParams.get('highlight') ?? ''

  const [city, setCity] = useState(() => {
    if (urlLocation) return urlLocation
    if (urlCategory) return ''
    return loadSavedCity()
  })
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [results, setResults] = useState<Business[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [highlightId, setHighlightId] = useState<string>('')
  const [listOpen, setListOpen] = useState(false)
  const cityWrapRef = useRef<HTMLDivElement>(null)
  const highlightCardRef = useRef<HTMLDivElement>(null)
  const autoFiredRef = useRef(false)

  useEffect(() => {
    const cat = CATEGORIES.find((c) => c.value === urlCategory)
    if (urlLocation && cat && !autoFiredRef.current) {
      autoFiredRef.current = true
      void runSearch(cat.value, urlLocation, urlHighlight || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (highlightId && highlightCardRef.current) {
      highlightCardRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [highlightId, results])

  async function runSearch(catValue: string, cityValue: string, highlight?: string) {
    setError('')
    if (!resolveOpenTown(cityValue)) {
      setLoading(false)
      setSearched(false)
      setActiveCategory(null)
      setError(NOT_OPEN_MESSAGE)
      return
    }
    setActiveCategory(catValue)
    setSearched(true)
    setLoading(true)
    setResults([])
    saveCity(cityValue)

    const params = new URLSearchParams({ category: catValue, location: cityValue })
    if (highlight) params.set('highlight', highlight)

    window.history.replaceState(null, '', `/?${params.toString()}`)

    const res = await fetch(`/api/search?${params.toString()}`)
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
      setResults([])
    } else {
      setResults(data.businesses.slice(0, 3))
      setHighlightId(highlight ?? '')
    }
    setLoading(false)
  }

  function handleCategoryClick(value: string) {
    const trimmed = city.trim()
    if (!resolveOpenTown(trimmed)) {
      setError(isUnresolvedTown(trimmed) ? CHOOSE_TOWN : NOT_OPEN_MESSAGE)
      const input = cityWrapRef.current?.querySelector('input')
      if (input instanceof HTMLInputElement) {
        input.dataset.quiet = '1'
        input.focus()
      }
      return
    }
    void runSearch(value, trimmed)
  }

  function goBack() {
    setActiveCategory(null)
    setResults([])
    setSearched(false)
    setLoading(false)
    setHighlightId('')
    setError('')
    const params = new URLSearchParams()
    const trimmed = city.trim()
    if (trimmed) params.set('location', trimmed)
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `/?${qs}` : '/')
  }

  const activeCat = CATEGORIES.find((c) => c.value === activeCategory)
  const showResults = searched && !!activeCat

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-8 pt-3">
      {showResults && activeCat ? (
        <>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-11 items-center text-[17px] leading-[22px] text-[#007AFF]"
          >
            ‹ QuickProList
          </button>
          <h1 className="text-[34px] font-bold leading-[41px] tracking-[-0.4px] text-black">
            {activeCat.label}
          </h1>
          <p className="mt-1 text-[17px] leading-[22px] text-[rgba(60,60,67,0.6)]">
            {townName(city)}
          </p>

          {error && (
            <p className="mt-3 text-[17px] leading-[22px] text-[#FF3B30]">{error}</p>
          )}

          {loading ? (
            <div className="mt-4 overflow-hidden rounded-[10px] bg-white">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 bg-[#E5E5EA]" />
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-[10px] bg-white">
              {results.map((b, i) => {
                const highlighted = isHighlighted(b, highlightId)
                return (
                  <div key={b.id} ref={highlighted ? highlightCardRef : undefined}>
                    <BusinessCard
                      business={b}
                      trade={sentenceTrade(activeCat.term)}
                      highlighted={highlighted}
                      separator={i < results.length - 1}
                    />
                  </div>
                )
              })}
            </div>
          ) : !error ? (
            <p className="mt-4 text-[17px] leading-[22px] text-[rgba(60,60,67,0.6)]">
              {`No ${activeCat.label.toLowerCase()} in ${townName(city)} yet.`}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <h1 className="text-[34px] font-bold leading-[41px] tracking-[-0.4px] text-black">
            QuickProList
          </h1>
          <div ref={cityWrapRef} className="mt-4">
            <OpenTownInput
              value={city}
              onChange={(v) => {
                setCity(v)
                setError('')
                if (!v) {
                  window.history.replaceState(null, '', '/')
                  setResults([])
                  setActiveCategory(null)
                  setSearched(false)
                }
              }}
              onSubmit={() => {
                if (activeCategory) handleCategoryClick(activeCategory)
              }}
              onPick={(picked) => {
                if (activeCategory) void runSearch(activeCategory, picked)
              }}
              placeholder="City"
            />
          </div>
          {error && (
            <p className="mt-3 text-[17px] leading-[22px] text-[#FF3B30]">{error}</p>
          )}
          <div className="mt-4 overflow-hidden rounded-[10px] bg-white">
            {CATEGORIES.map(({ label, value }, i) => (
              <button
                key={value}
                type="button"
                onClick={() => handleCategoryClick(value)}
                className="relative flex min-h-11 w-full items-center justify-between px-4 text-left text-[17px] leading-[22px] text-black active:bg-[rgba(118,118,128,0.12)]"
              >
                {label}
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#C7C7CC]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" />
                </svg>
                {i < CATEGORIES.length - 1 && (
                  <span className="pointer-events-none absolute bottom-0 left-4 right-0 h-px bg-[rgba(60,60,67,0.29)]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <footer className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-[13px] leading-[18px] text-[rgba(60,60,67,0.6)]">
        <button type="button" onClick={() => setListOpen(true)} className="text-[#007AFF]">
          List your business
        </button>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <span>Powered by Yelp Fusion</span>
      </footer>

      {listOpen && (
        <div className="mt-4">
          <ListBusinessSection onClose={() => setListOpen(false)} />
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  )
}
