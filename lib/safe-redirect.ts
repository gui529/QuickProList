/**
 * Guards against open redirects when honoring a caller-supplied `next`
 * destination (e.g. `/auth/callback?next=...`). Only same-origin relative
 * paths are allowed; anything else (absolute URLs, protocol-relative URLs
 * like `//evil.com`, or backslash tricks like `/\evil.com` that some
 * browsers normalize to protocol-relative) falls back to `fallback`.
 */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback: string = '/admin'
): string {
  if (!next) return fallback

  // Must be a path (single leading slash), not a protocol-relative URL
  // (`//host/...`) and not a backslash variant some browsers treat the
  // same way (`/\host/...`).
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback
  }

  // Defense in depth: reject anything that embeds a scheme
  // (e.g. a decoded/encoded absolute URL slipped past the checks above).
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next)) {
    return fallback
  }

  return next
}
