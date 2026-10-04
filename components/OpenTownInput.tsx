'use client'

import { useEffect, useRef, useState } from 'react'
import { OPEN_TOWNS } from '@/lib/open-towns'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  onPick?: (value: string) => void
  placeholder?: string
}

export default function OpenTownInput({ value, onChange, onSubmit, onPick, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const query = value.trim().toLowerCase()
  const towns = OPEN_TOWNS.filter((t) => t.slug.startsWith(query))

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClickAway)
    return () => window.removeEventListener('mousedown', onClickAway)
  }, [])

  function pick(name: string) {
    onChange(name)
    setOpen(false)
    onPick?.(name)
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, towns.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && towns[highlight] && towns[highlight].name.toLowerCase() !== query) {
        e.preventDefault()
        pick(towns[highlight].name)
      } else {
        setOpen(false)
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
        aria-label="Town"
        placeholder={placeholder ?? 'Choose your town'}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setHighlight(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        className="w-full bg-transparent py-3.5 sm:py-4 text-base text-slate-900 placeholder-slate-400 focus:outline-none"
      />
      {open && towns.length > 0 && (
        <ul
          aria-label="Towns we serve"
          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl ring-1 ring-slate-200 shadow-lg z-30 max-h-64 overflow-y-auto py-1"
        >
          {towns.map((t, i) => (
            <li key={t.slug}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(t.name)}
                className={`w-full text-left px-4 py-2 text-sm ${
                  i === highlight ? 'bg-amber-50 text-slate-900' : 'text-slate-700'
                }`}
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
