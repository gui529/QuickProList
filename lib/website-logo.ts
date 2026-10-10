const FETCH_TIMEOUT_MS = 12_000
const MAX_HTML_BYTES = 512_000

const BLOCKED_HOST_RE =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|::1|\[::1\])/i

function isBlockedHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase()
  if (!h || h === 'localhost') return true
  if (BLOCKED_HOST_RE.test(h)) return true
  return false
}

export function normalizeWebsiteUrl(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`
    const u = new URL(withProto)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (isBlockedHost(u.hostname)) return null
    return u.toString()
  } catch {
    return null
  }
}

function resolveUrl(pageUrl: string, href: string): string | null {
  const h = href.trim()
  if (!h || h.startsWith('data:')) return null
  try {
    return new URL(h, pageUrl).toString()
  } catch {
    return null
  }
}

/** Best-effort logo candidates from HTML (og:image, icons). */
export function extractLogoCandidates(html: string, pageUrl: string): string[] {
  const out: string[] = []
  const push = (raw: string | undefined) => {
    const u = raw ? resolveUrl(pageUrl, raw) : null
    if (u && !out.includes(u)) out.push(u)
  }

  const og =
    html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i)
  push(og?.[1])

  const tw =
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
  push(tw?.[1])

  const linkTags = html.match(/<link[^>]+>/gi) ?? []
  for (const tag of linkTags) {
    const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? ''
    if (!rel.includes('icon') && !rel.includes('apple-touch-icon')) continue
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1]
    push(href)
  }

  return out
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'QuickProList-CampaignBot/1.0 (+https://www.quickprolist.com)',
        accept: init?.method === 'HEAD' ? 'image/*,*/*' : 'text/html,application/xhtml+xml',
        ...(init?.headers ?? {}),
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

async function looksLikeImage(url: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url, { method: 'HEAD' })
    if (!res.ok) return false
    const ct = res.headers.get('content-type') ?? ''
    return ct.startsWith('image/')
  } catch {
    return false
  }
}

/**
 * Fetch a business homepage and return the first plausible logo image URL, or null.
 */
export async function fetchLogoFromWebsite(website: string): Promise<string | null> {
  const pageUrl = normalizeWebsiteUrl(website)
  if (!pageUrl) return null

  let html: string
  try {
    const res = await fetchWithTimeout(pageUrl)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_HTML_BYTES) return null
    html = new TextDecoder('utf-8', { fatal: false }).decode(buf)
  } catch {
    return null
  }

  const candidates = extractLogoCandidates(html, pageUrl)
  for (const url of candidates) {
    const normalized = normalizeWebsiteUrl(url)
    if (!normalized) continue
    if (await looksLikeImage(normalized)) return normalized
  }

  // og:image URLs sometimes block HEAD; return first https candidate if any
  const first = candidates.map((c) => normalizeWebsiteUrl(c)).find(Boolean)
  return first ?? null
}
