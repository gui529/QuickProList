'use client'

import { useEffect, useRef, useState } from 'react'

interface City {
  label: string
  value: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  onPick?: (value: string) => void
  placeholder?: string
  className?: string
}

export default function CityAutocomplete({ value, onChange, onSubmit, onPick, placeholder, className }: Props) {
  const [open, setOpen] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  const [highlight, setHighlight] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const aborterRef = useRef<AbortController | null>(null)

  const trimmedValue = value.trim()
  const visibleCities = trimmedValue.length < 2 ? [] : cities

  useEffect(() => {
    const q = value.trim()
    if (q.length < 2) {
      return
    }
    aborterRef.current?.abort()
    const ac = new AbortController()
    aborterRef.current = ac
    void Promise.resolve().then(() => setLoading(true))
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(q)}`, { signal: ac.signal })
        if (!res.ok) return
        const data = await res.json()
        setCities(data.cities ?? [])
        setHighlight(0)
      } catch {
        /* aborted */
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(t)
      ac.abort()
    }
  }, [value])

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClickAway)
    return () => window.removeEventListener('mousedown', onClickAway)
  }, [])

  function pick(city: City) {
    onChange(city.value)
    setOpen(false)
    setCities([])
    onPick?.(city.value)
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, visibleCities.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && visibleCities[highlight]) {
        e.preventDefault()
        pick(visibleCities[highlight])
      } else {
        onSubmit?.()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        autoComplete="off"
        placeholder={placeholder ?? 'Start typing your city…'}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        className={className ?? 'w-full bg-transparent py-3.5 sm:py-4 text-base text-slate-900 placeholder-slate-400 focus:outline-none'}
      />
      {open && (visibleCities.length > 0 || loading) && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl ring-1 ring-slate-200 shadow-lg z-30 max-h-64 overflow-y-auto py-1">
          {loading && visibleCities.length === 0 && (
            <li className="px-4 py-2 text-sm text-slate-400">Searching…</li>
          )}
          {visibleCities.map((c, i) => (
            <li key={c.label}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                  i === highlight ? 'bg-amber-50 text-slate-900' : 'text-slate-700'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
