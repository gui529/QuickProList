'use client'

import { useState } from 'react'

export function CampaignProspectLogo({
  name,
  logoUrl,
  size = 40,
}: {
  name: string
  logoUrl?: string | null
  size?: number
}) {
  const [broken, setBroken] = useState(false)
  const initial = (name.trim()[0] ?? '?').toUpperCase()
  if (logoUrl && !broken) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-lg object-cover bg-slate-100 ring-1 ring-slate-200 shrink-0"
        onError={() => setBroken(true)}
      />
    )
  }
  return (
    <div
      className="rounded-lg bg-slate-200 text-slate-600 font-bold flex items-center justify-center shrink-0 ring-1 ring-slate-200"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initial}
    </div>
  )
}
