'use client'

import { useState } from 'react'
import type { Business } from '@/lib/business'

interface Props {
  open: boolean
  onClose: () => void
  business?: Business
}

export default function ReviewLinkModal({ open, onClose, business }: Props) {
  const [copied, setCopied] = useState(false)

  // Mirrors ShareLinkModal's pattern: this component returns `null` (not
  // unmounting) while closed, so reset "copied" as soon as `open` flips to
  // false rather than letting it leak into the next open.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open && copied) {
      setCopied(false)
    }
  }

  if (!open || !business) return null

  const url = business.reviewUrl ?? ''
  const message = url
    ? `Hi! If you have a minute, we'd really appreciate it if you could leave us a quick review: ${url}`
    : ''

  async function handleCopy() {
    if (!message) return
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Copy this message:', message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900">Get more reviews</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Share this with <span className="font-medium text-slate-700">{business.name}</span>&apos;s customers
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          {url ? (
            <>
              <textarea
                readOnly
                value={message}
                rows={3}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-xl ring-1 ring-slate-200 px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              <div className="flex justify-end gap-2 pt-1">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Open in new tab
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17 17 7" />
                    <path d="M8 7h9v9" />
                  </svg>
                </a>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
                >
                  {copied ? '✓ Copied' : 'Copy message'}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              No review link available yet.{' '}
              {business.source === 'manual'
                ? 'Add a review URL when editing this business.'
                : 'This business has no Yelp listing to link to.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
