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
    <div ref={wrapRef} className="relative">
      <div className="flex h-11 items-center gap-2 rounded-[10px] bg-[rgba(118,118,128,0.12)] px-3">
        <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] shrink-0 text-[rgba(60,60,67,0.6)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          autoComplete="off"
          aria-label="Town"
          placeholder={placeholder ?? 'City'}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setHighlight(0)
            setOpen(true)
          }}
          onFocus={(e) => {
          if (e.currentTarget.dataset.quiet) {
            delete e.currentTarget.dataset.quiet
            return
          }
          setOpen(true)
        }}
          onKeyDown={handleKey}
          className="min-w-0 flex-1 bg-transparent text-[17px] leading-[22px] text-black placeholder:text-[rgba(60,60,67,0.6)] focus:outline-none"
        />
      </div>
      {open && towns.length > 0 && (
        <ul
          aria-label="Towns we serve"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[10px] bg-white"
        >
          {towns.map((t, i) => (
            <li key={t.slug}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(t.name)}
                className={`min-h-11 w-full px-4 text-left text-[17px] leading-[22px] text-black ${
                  i === highlight ? 'bg-[rgba(118,118,128,0.12)]' : ''
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
