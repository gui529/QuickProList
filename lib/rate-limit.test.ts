import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  InMemoryRateLimitStore,
  checkRateLimit,
  getClientIp,
  getRateLimitStore,
  setRateLimitStore,
  type RateLimitStore,
} from './rate-limit'

describe('InMemoryRateLimitStore (default implementation)', () => {
  it('allows requests up to maxRequests within the window', () => {
    const store = new InMemoryRateLimitStore()
    expect(store.check('a', 3, 60_000)).toBe(true)
    expect(store.check('a', 3, 60_000)).toBe(true)
    expect(store.check('a', 3, 60_000)).toBe(true)
  })

  it('blocks requests once maxRequests is exceeded within the window', () => {
    const store = new InMemoryRateLimitStore()
    expect(store.check('b', 2, 60_000)).toBe(true)
    expect(store.check('b', 2, 60_000)).toBe(true)
    expect(store.check('b', 2, 60_000)).toBe(false)
  })

  it('tracks separate keys independently', () => {
    const store = new InMemoryRateLimitStore()
    expect(store.check('one', 1, 60_000)).toBe(true)
    expect(store.check('one', 1, 60_000)).toBe(false)
    expect(store.check('two', 1, 60_000)).toBe(true)
  })

  it('resets the count once the window has elapsed', () => {
    vi.useFakeTimers()
    try {
      const store = new InMemoryRateLimitStore()
      expect(store.check('c', 1, 1_000)).toBe(true)
      expect(store.check('c', 1, 1_000)).toBe(false)

      vi.advanceTimersByTime(1_001)

      expect(store.check('c', 1, 1_000)).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('checkRateLimit / setRateLimitStore contract', () => {
  afterEach(() => {
    // Restore a fresh default store so tests don't leak state into each other.
    setRateLimitStore(new InMemoryRateLimitStore())
  })

  it('delegates to whatever store is currently active', () => {
    const calls: Array<[string, number, number]> = []
    const fakeStore: RateLimitStore = {
      check(key, maxRequests, windowMs) {
        calls.push([key, maxRequests, windowMs])
        return true
      },
    }

    setRateLimitStore(fakeStore)
    expect(getRateLimitStore()).toBe(fakeStore)

    const result = checkRateLimit('search:1.2.3.4', 10)

    expect(result).toBe(true)
    expect(calls).toEqual([['search:1.2.3.4', 10, 60_000]])
  })

  it('lets a swapped-in store (e.g. a future Redis-backed one) enforce limits', () => {
    let remaining = 2
    const fakeStore: RateLimitStore = {
      check() {
        if (remaining <= 0) return false
        remaining--
        return true
      },
    }

    setRateLimitStore(fakeStore)

    expect(checkRateLimit('k', 5)).toBe(true)
    expect(checkRateLimit('k', 5)).toBe(true)
    expect(checkRateLimit('k', 5)).toBe(false)
  })

  it('call sites do not need to change to pick up a swapped store', () => {
    // checkRateLimit's signature (key, maxRequests) is unchanged regardless
    // of which RateLimitStore implementation is active underneath it.
    setRateLimitStore(new InMemoryRateLimitStore())
    expect(checkRateLimit('same-signature', 1)).toBe(true)
    expect(checkRateLimit('same-signature', 1)).toBe(false)
  })
})

describe('getClientIp', () => {
  it('reads the first entry of x-forwarded-for', () => {
    const req = { headers: { get: () => '1.2.3.4, 5.6.7.8' } }
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('falls back to "unknown" when the header is missing', () => {
    const req = { headers: { get: () => null } }
    expect(getClientIp(req)).toBe('unknown')
  })
})
