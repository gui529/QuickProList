import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

let session: { user: { email: string } } | null = null
let configured = true

vi.mock('@supabase/supabase-js', () => {
  throw new Error('proxy must not import Supabase')
})

vi.mock('@/lib/auth-config', () => ({
  isAuthConfigured: () => configured,
  auth: (handler: (req: NextRequest & { auth: unknown }) => Response) => (req: NextRequest) =>
    handler(Object.assign(req, { auth: session })),
}))

import { proxy, config } from './proxy'

function req(path: string) {
  return new NextRequest(`https://quickprolist.example${path}`)
}

function matches(path: string) {
  return config.matcher.some((source) => new RegExp(`^${source.replace('/:path*', '(?:/.*)?')}$`).test(path))
}

describe('proxy matcher', () => {
  it.each(['/admin', '/admin/campaigns'])('runs on %s', (path) => {
    expect(matches(path)).toBe(true)
  })

  it.each(['/', '/search', '/pro/abc', '/login', '/api/search', '/api/auth/session', '/administrators'])(
    'skips %s',
    (path) => {
      expect(matches(path)).toBe(false)
    }
  )
})

describe('proxy', () => {
  beforeEach(() => {
    session = null
    configured = true
  })

  it('redirects a signed-out visitor on /admin to /login', async () => {
    const res = await proxy(req('/admin'))
    expect(res.status).toBe(307)
    const loc = new URL(res.headers.get('location')!)
    expect(loc.origin).toBe('https://quickprolist.example')
    expect(loc.pathname).toBe('/login')
    expect(loc.search).toBe('')
  })

  it('redirects a signed-out visitor on /admin sub-paths to /login', async () => {
    const res = await proxy(req('/admin/campaigns'))
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
  })

  it('lets a signed-in user through to /admin without redirecting', async () => {
    session = { user: { email: 'admin@example.com' } }
    const res = await proxy(req('/admin'))
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })

  it('does not redirect signed-out visitors on public pages', async () => {
    for (const path of ['/', '/search', '/login', '/pro/abc', '/api/search', '/administrators']) {
      const res = await proxy(req(path))
      expect(res.headers.get('location'), path).toBeNull()
    }
  })

  it('keeps public pages working when auth env is missing', async () => {
    configured = false
    const res = await proxy(req('/'))
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })

  it('sends /admin to /login when auth env is missing', async () => {
    configured = false
    const res = await proxy(req('/admin'))
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
  })
})
