import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const exchangeCodeForSession = vi.fn()
let setAllFn: ((c: { name: string; value: string; options?: object }[]) => void) | undefined

vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    opts: { cookies: { setAll: typeof setAllFn } }
  ) => {
    setAllFn = opts.cookies.setAll
    return { auth: { exchangeCodeForSession } }
  },
}))

import { GET } from './route'

function call(qs: string) {
  return GET(new NextRequest(`https://quickprolist.example/auth/callback${qs}`))
}

function location(res: Response) {
  return new URL(res.headers.get('location')!)
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset()
    setAllFn = undefined
  })

  it('lands on /admin with the session cookie when the exchange succeeds', async () => {
    exchangeCodeForSession.mockImplementation(async () => {
      setAllFn?.([{ name: 'sb-session', value: 'abc' }])
      return { error: null }
    })
    const res = await call('?code=good')
    expect(exchangeCodeForSession).toHaveBeenCalledWith('good')
    const loc = location(res)
    expect(loc.origin).toBe('https://quickprolist.example')
    expect(loc.pathname).toBe('/admin')
    expect(res.headers.get('set-cookie')).toMatch(/sb-session=abc/)
  })

  it('ignores an off-site next and still lands on /admin', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })
    const res = await call('?code=good&next=//evil.com')
    expect(location(res).pathname).toBe('/admin')
    expect(location(res).origin).toBe('https://quickprolist.example')
  })

  it('sends a failed exchange to /login with the reason', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: 'PKCE code verifier not found in storage' },
    })
    const res = await call('?code=bad')
    const loc = location(res)
    expect(loc.pathname).toBe('/login')
    expect(loc.searchParams.get('error')).toBe('PKCE code verifier not found in storage')
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('sends a missing code to /login?error=missing_code', async () => {
    const res = await call('')
    expect(location(res).pathname).toBe('/login')
    expect(location(res).searchParams.get('error')).toBe('missing_code')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('passes along the error Supabase reports for an expired link', async () => {
    const res = await call('?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
    expect(location(res).searchParams.get('error')).toBe('otp_expired')
  })
})
