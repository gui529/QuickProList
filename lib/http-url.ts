/**
 * Only accept http(s) destinations for user-suppliable URL fields
 * (`websiteUrl`, `reviewUrl`) that end up rendered as a raw anchor `href`
 * on public pages (`app/pro/[id]/page.tsx`, `components/BusinessCard.tsx`,
 * `components/ReviewLinkModal.tsx`).
 * A bare domain like `example.com` (no scheme) is left as-is — existing
 * website render sites already prepend `https://` for those. Anything that
 * declares a non-http(s) scheme (`javascript:`, `data:`, `tel:`, etc.) is
 * dropped rather than stored, since that scheme would otherwise execute or
 * hijack a dial link in a visitor's browser.
 *
 * Per the WHATWG URL spec, browsers strip ASCII tab/CR/LF characters
 * anywhere in a URL string, and also strip *leading/trailing* C0 control
 * characters (`\x00`-`\x1F`, not just tab/CR/LF) or spaces, before
 * resolving its scheme (confirmed via Node's `URL` parser, which `href`
 * resolution follows) — so an obfuscated scheme like `"java\tscript:alert(1)"`
 * or `"\x01javascript:alert(1)"` still resolves to `javascript:` on click
 * even though a naive contiguous-scheme regex wouldn't see it. Strip those
 * characters the same way before scheme-sniffing so the check can't be
 * bypassed by embedding or prefixing them around the scheme.
 */
export function sanitizeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const edgeStripped = value.replace(/^[\x00-\x1F ]+/, '').replace(/[\x00-\x1F ]+$/, '')
  const trimmed = edgeStripped.replace(/[\t\r\n]/g, '').trim()
  if (!trimmed) return null
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed)
  if (schemeMatch && !/^https?$/i.test(schemeMatch[1])) return null
  return trimmed
}

/**
 * Href safe to put on a public "Leave a review" link.
 * Only an http or https URL is returned. Bare domains, `javascript:`, and
 * `tel:` are refused so the review control never replaces a phone link.
 */
export function httpUrlHref(value: string | null | undefined): string | null {
  const sanitized = sanitizeHttpUrl(value)
  if (!sanitized) return null
  try {
    const parsed = new URL(sanitized)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return sanitized
  } catch {
    return null
  }
}
