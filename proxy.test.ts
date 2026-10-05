import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

type Cookie = { name: string; value: string; options?: object }
type CookieAdapter = { getAll: () => { name: string; value: string }[]; setAll: (c: Cookie[]) => void }

const getUser = vi.fn()
let adapter: CookieAdapter | undefined

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, opts: { cookies: CookieAdapter }) => {
    adapter = opts.cookies
    return { auth: { getUser } }
  },
}))

import { proxy, config } from './proxy'

function req(path: string, cookie?: string) {
  return new NextRequest(`https://quickprolist.example${path}`, {
    headers: cookie ? { cookie } : {},
  })
}

function matches(path: string) {
  return config.matcher.some((source) => new RegExp(`^${source}$`).test(path))
}

function signedInWithRefresh() {
  getUser.mockImplementation(async () => {
    adapter?.setAll([{ name: 'sb-access', value: 'fresh-token', options: { path: '/' } }])
    return { data: { user: { id: 'u1', email: 'admin@example.com' } } }
  })
}

describe('proxy matcher', () => {
  it.each(['/', '/search', '/pro/abc', '/admin', '/admin/campaigns', '/login', '/auth/callback', '/api/search'])(
    'refreshes the session on %s',
    (path) => {
      expect(matches(path)).toBe(true)
    }
  )

  it.each([
    '/_next/static/chunks/app.js',
    '/_next/image',
    '/favicon.ico',
    '/logo.svg',
    '/hero.png',
    '/photos/a.jpg',
    '/photos/a.jpeg',
    '/anim.gif',
    '/photos/a.webp',
  ])('skips static asset %s', (path) => {
    expect(matches(path)).toBe(false)
  })
})

describe('proxy', () => {
  beforeEach(() => {
    getUser.mockReset()
    adapter = undefined
  })

  it('admin with an expired token: refreshed cookie reaches the request (for the header) and the response (for the browser) on /', async () => {
    signedInWithRefresh()
    const res = await proxy(req('/', 'sb-access=expired-token'))

    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('set-cookie')).toMatch(/sb-access=fresh-token/)
    expect(res.headers.get('x-middleware-request-cookie')).toMatch(/sb-access=fresh-token/)
    expect(res.headers.get('x-middleware-request-cookie')).not.toMatch(/expired-token/)
  })

  it('lets a signed-in admin through to /admin without redirecting', async () => {
    signedInWithRefresh()
    const res = await proxy(req('/admin'))
    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('set-cookie')).toMatch(/sb-access=fresh-token/)
  })

  it('does not redirect a signed-out visitor on /', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await proxy(req('/'))
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })

  it('does not redirect a signed-out visitor on other public pages', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    for (const path of ['/search', '/login', '/pro/abc', '/api/search', '/administrators']) {
      const res = await proxy(req(path))
      expect(res.headers.get('location'), path).toBeNull()
    }
  })

  it('redirects a signed-out visitor on /admin to /login', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await proxy(req('/admin'))
    expect(res.status).toBe(307)
    const loc = new URL(res.headers.get('location')!)
    expect(loc.origin).toBe('https://quickprolist.example')
    expect(loc.pathname).toBe('/login')
  })

  it('redirects a signed-out visitor on /admin sub-paths to /login', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await proxy(req('/admin/campaigns'))
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
  })

  it('keeps refreshed cookies on the /login redirect when the refresh token was rejected', async () => {
    getUser.mockImplementation(async () => {
      adapter?.setAll([{ name: 'sb-access', value: '', options: { path: '/', maxAge: 0 } }])
      return { data: { user: null } }
    })
    const res = await proxy(req('/admin', 'sb-access=dead'))
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
    expect(res.headers.get('set-cookie')).toMatch(/sb-access=;/)
  })
})
