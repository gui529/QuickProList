'use client'

import { formatTown, OPEN_TOWNS } from '@/lib/open-towns'

interface Props {
  value: string[]
  onChange: (cities: string[]) => void
}

function citySlug(input: string): string {
  return input.trim().toLowerCase().split(',')[0].trim()
}

export default function CityMultiSelect({ value, onChange }: Props) {
  function toggle(slug: string, label: string) {
    const selected = value.some((c) => citySlug(c) === slug)
    if (selected) {
      onChange(value.filter((c) => citySlug(c) !== slug))
      return
    }
    onChange([...value, label])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPEN_TOWNS.map((town) => {
        const selected = value.some((c) => citySlug(c) === town.slug)
        return (
          <button
            key={town.slug}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(town.slug, formatTown(town))}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ring-1 transition-colors ${
              selected
                ? 'bg-amber-50 text-amber-900 ring-amber-300'
                : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {town.name}
          </button>
        )
      })}
    </div>
  )
}
