'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'
import BusinessCard from '@/components/BusinessCard'
import CityAutocomplete from '@/components/CityAutocomplete'
import ListBusinessSection from '@/components/ListBusinessSection'
import type { Business } from '@/lib/yelp'

const LOCATION_KEY = 'quickprolist:lastLocation'

function loadSavedCity(): string {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (!raw) return ''
    if (raw.startsWith('{')) {
      localStorage.removeItem(LOCATION_KEY)
      return ''
    }
    return raw
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
  const [activeCategory, setActiveCategory] = useState<string | null>(() => {
    const cat = CATEGORIES.find((c) => c.value === urlCategory)
    return cat ? cat.value : null
  })
  const [results, setResults] = useState<Business[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [highlightId, setHighlightId] = useState<string>('')
  const cityWrapRef = useRef<HTMLDivElement>(null)
  const highlightCardRef = useRef<HTMLDivElement>(null)
  const autoFiredRef = useRef(false)

  // Initial mount: auto-run the search if the URL already specified a city + category
  useEffect(() => {
    const cat = CATEGORIES.find((c) => c.value === urlCategory)
    if (urlLocation && cat && !autoFiredRef.current) {
      autoFiredRef.current = true
      void runSearch(cat.value, urlLocation, urlHighlight || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll highlighted card into view once results render
  useEffect(() => {
    if (highlightId && highlightCardRef.current) {
      highlightCardRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [highlightId, results])

  async function runSearch(catValue: string, cityValue: string, highlight?: string) {
    setError('')
    setActiveCategory(catValue)
    setLoading(true)
    setResults([])
    saveCity(cityValue)

    const params = new URLSearchParams({ category: catValue, location: cityValue })
    if (highlight) params.set('highlight', highlight)

    // Update URL bar silently so it's shareable
    window.history.replaceState(null, '', `/?${params.toString()}`)

    const res = await fetch(`/api/search?${params.toString()}`)
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
    } else {
      setResults(data.businesses.slice(0, 5))
      setHighlightId(highlight ?? '')
    }
    setLoading(false)
  }

  async function handleCategoryClick(value: string) {
    const trimmed = city.trim()
    if (!trimmed) {
      setActiveCategory(value)
      setError('Type your city first — we’ll auto-search once you pick one.')
      cityWrapRef.current?.querySelector('input')?.focus()
      return
    }
    // Manual category change clears any inherited highlight
    await runSearch(value, trimmed)
  }

  const activeCat = CATEGORIES.find((c) => c.value === activeCategory)

  return (
    <div className="-mx-4 sm:-mx-6 -mt-6 sm:-mt-8">
      <section className="relative hero-bg overflow-hidden">
        <div className="absolute inset-0 grid-dots opacity-60 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16 sm:pt-14 sm:pb-20">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 ring-1 ring-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Trusted local pros
            </span>
            <h1 className="mt-4 sm:mt-5 text-[28px] leading-[1.15] sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 max-w-3xl px-2">
              The right hand for every{' '}
              <span className="relative inline-block whitespace-nowrap">
                <span className="relative z-10">home project</span>
                <span className="absolute inset-x-0 bottom-0.5 sm:bottom-1 h-2 sm:h-3 bg-amber-300/50 rounded-sm -z-0" />
              </span>
              .
            </h1>
            <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-slate-500 max-w-xl px-2">
              Plumbers, electricians, HVAC and more — find top-rated pros in your city in seconds.
            </p>

            <div className="mt-6 sm:mt-8 w-full max-w-xl">
              <div ref={cityWrapRef} className="relative flex items-center bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-amber-400 transition">
                <span className="pl-3 sm:pl-4 pr-1 sm:pr-2 text-slate-400 flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <CityAutocomplete
                  value={city}
                  onChange={(v) => {
                    setCity(v)
                    setError('')
                    if (!v) {
                      window.history.replaceState(null, '', '/')
                      setResults([])
                      setActiveCategory(null)
                    }
                  }}
                  onSubmit={() => {
                    if (activeCategory) handleCategoryClick(activeCategory)
                  }}
                  onPick={(picked) => {
                    if (activeCategory) {
                      void runSearch(activeCategory, picked)
                    }
                  }}
                  placeholder="Start typing your city, e.g. Acworth"
                />
              </div>

              {error && (
                <p className="mt-3 text-sm text-rose-600 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-10 relative">
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-[0_10px_40px_rgba(15,23,42,0.06)] p-4 sm:p-6">
          <div className="flex items-baseline justify-between mb-3 sm:mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Pick a category</h2>
            <span className="text-xs text-slate-500">{CATEGORIES.length} services</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-10 gap-2 sm:gap-2.5">
            {CATEGORIES.map(({ label, value, icon }) => {
              const active = activeCategory === value
              return (
                <button
                  key={value}
                  onClick={() => handleCategoryClick(value)}
                  className={`group relative flex flex-col items-center gap-1.5 sm:gap-2 px-1.5 py-3 sm:px-2 sm:py-4 rounded-xl text-[11.5px] sm:text-[12.5px] font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-slate-50 active:bg-slate-100 hover:bg-white hover:ring-1 hover:ring-slate-200 hover:shadow-sm text-slate-700'
                  }`}
                >
                  <span className="text-xl sm:text-2xl transition-transform group-hover:scale-110">
                    {icon}
                  </span>
                  <span className="text-center leading-tight break-words">{label}</span>
                  {active && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 sm:mt-10 pb-16 sm:pb-20">
        {(loading || results.length > 0) && (
          <div className="w-full max-w-3xl mx-auto">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {loading
                  ? 'Searching nearby pros…'
                  : `Top ${results.length} ${activeCat?.label ?? ''}`}
              </h3>
              {!loading && city && (
                <span className="text-xs text-slate-500">in {city}</span>
              )}
            </div>
            {loading ? (
              <div className="flex flex-col gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-40 skeleton rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {results.map((b) => {
                  const highlighted = isHighlighted(b, highlightId)
                  return highlighted ? (
                    <div key={b.id} ref={highlightCardRef} className="flex flex-col gap-1.5">
                      <span className="self-start inline-flex items-center gap-1.5 bg-amber-500 text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shadow">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                          <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.6l-5.9 3.08 1.13-6.58L2.45 9.44l6.6-.96L12 2.5z" />
                        </svg>
                        This is your listing
                      </span>
                      <BusinessCard business={b} highlighted />
                    </div>
                  ) : (
                    <BusinessCard key={b.id} business={b} />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="mt-12 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: '🛡️', title: 'Verified pros', body: 'Hand-picked, vetted local businesses.' },
              { icon: '⚡', title: 'Fast results', body: 'Top-matched pros in under a second.' },
              { icon: '📍', title: 'Local first', body: 'Pinned by city — not algorithmic noise.' },
            ].map((f) => (
              <div key={f.title} className="bg-white/70 rounded-2xl ring-1 ring-slate-200 p-5">
                <div className="text-2xl">{f.icon}</div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{f.title}</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <ListBusinessSection />
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
