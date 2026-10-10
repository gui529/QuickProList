import { formatPhoneDisplay } from '@/lib/phone'

function websiteHref(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

export function CampaignContactLines({
  email,
  phone,
  website,
}: {
  email?: string | null
  phone?: string | null
  website?: string | null
}) {
  const phoneText = phone?.trim() ? formatPhoneDisplay(phone.trim()) : null
  const site = website?.trim() ?? ''
  const href = site ? websiteHref(site) : ''

  return (
    <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
      {email?.trim() && (
        <li className="truncate">
          <span className="text-slate-400 text-xs mr-1">Email</span>
          {email.trim()}
        </li>
      )}
      {phoneText && (
        <li>
          <span className="text-slate-400 text-xs mr-1">Phone</span>
          <a href={`tel:${phone!.trim().replace(/\D/g, '')}`} className="hover:text-slate-900">
            {phoneText}
          </a>
        </li>
      )}
      {href && (
        <li className="truncate max-w-full">
          <span className="text-slate-400 text-xs mr-1">Web</span>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-slate-700 hover:text-slate-900 underline"
          >
            {site.replace(/^https?:\/\//i, '')}
          </a>
        </li>
      )}
    </ul>
  )
}

export function ProResponseBadge({ response }: { response: 'yes' | 'no' | null | undefined }) {
  if (response === 'yes') {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
        Pro approved
      </span>
    )
  }
  if (response === 'no') {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
        Said no
      </span>
    )
  }
  return null
}
