'use client'

import type { AnchorHTMLAttributes } from 'react'
import type { ContactClickType } from '@/lib/kv'

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  businessId: string
  clickType: ContactClickType
}

/**
 * Wraps a plain contact `<a>` (phone/website/"Get Directions") on the
 * ProSite page so a click fires a fire-and-forget POST to
 * `/api/pro/[id]/click` without delaying navigation — `keepalive: true`
 * lets the request outlive the page unload that navigating away triggers.
 */
export default function TrackedContactLink({ businessId, clickType, onClick, ...anchorProps }: Props) {
  return (
    <a
      {...anchorProps}
      onClick={(e) => {
        try {
          fetch(`/api/pro/${businessId}/click`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ type: clickType }),
            keepalive: true,
          }).catch(() => {})
        } catch {
          // Never block navigation over a tracking failure.
        }
        onClick?.(e)
      }}
    />
  )
}
