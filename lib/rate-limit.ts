/**
 * Rate-limit store contract. A `RateLimitStore` tracks per-key request
 * counts over a fixed time window and reports whether the caller is still
 * within limits. `checkRateLimit` below delegates to whichever store is
 * currently active, so a shared (e.g. Redis-backed) implementation can be
 * swapped in via `setRateLimitStore` without touching any call site.
 */
export interface RateLimitStore {
  /**
   * Records a hit for `key` and returns true if the request is within
   * `maxRequests` for the current `windowMs` window, false if the caller
   * should be rate-limited.
   */
  check(key: string, maxRequests: number, windowMs: number): boolean
}

interface RateLimitEntry {
  count: number
  windowStart: number
}

/**
 * Default store: an in-memory `Map`. This is scoped per process/instance —
 * on a multi-instance deployment (e.g. Vercel serverless) each instance
 * enforces its own limit independently, so the effective aggregate limit
 * is higher than configured. Fine for local dev / single-instance
 * deployments; swap in a shared store (Redis/Upstash/Vercel KV) via
 * `setRateLimitStore` for correctness under real multi-instance traffic.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>()

  constructor() {
    // Prune stale entries every 5 minutes to prevent unbounded memory growth.
    if (typeof setInterval !== 'undefined') {
      const interval = setInterval(() => this.prune(), 5 * 60_000)
      // Don't keep the process alive just for pruning (no-op in browsers/edge).
      if (typeof interval === 'object' && interval && 'unref' in interval) {
        ;(interval as { unref(): void }).unref()
      }
    }
  }

  private prune(maxAgeMs = 60_000) {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now - entry.windowStart > maxAgeMs) this.store.delete(key)
    }
  }

  check(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now - entry.windowStart > windowMs) {
      this.store.set(key, { count: 1, windowStart: now })
      return true
    }

    if (entry.count >= maxRequests) return false

    entry.count++
    return true
  }
}

const DEFAULT_WINDOW_MS = 60_000

let activeStore: RateLimitStore = new InMemoryRateLimitStore()

/**
 * Swaps the active rate-limit store (e.g. for a shared Redis-backed
 * implementation, or a test double). Existing call sites keep working
 * unchanged since they only ever go through `checkRateLimit`.
 */
export function setRateLimitStore(store: RateLimitStore): void {
  activeStore = store
}

/** Returns the currently active store. Mainly useful for tests. */
export function getRateLimitStore(): RateLimitStore {
  return activeStore
}

export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return (forwarded ? forwarded.split(',')[0] : 'unknown').trim()
}

/**
 * Returns true if the request is within limits, false if rate-limited.
 * Uses a fixed 60-second window per IP per key, delegated to the active
 * `RateLimitStore`.
 */
export function checkRateLimit(key: string, maxRequests: number): boolean {
  return activeStore.check(key, maxRequests, DEFAULT_WINDOW_MS)
}

export function rateLimitResponse() {
  return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
  })
}
