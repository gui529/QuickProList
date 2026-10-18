import { beforeEach, describe, it, expect, vi } from 'vitest'

type SignIn = (args: {
  profile?: { email_verified?: boolean }
  account?: { provider?: string }
}) => boolean | Promise<boolean>
type Authorize = (
  credentials: { secret?: string } | undefined
) => Promise<{ id: string; email: string; name: string } | null>
const state = vi.hoisted(() => ({
  captured: undefined as { callbacks: { signIn: SignIn } } | undefined,
  authorize: undefined as Authorize | undefined,
  host: 'localhost:3000',
  forwardedFor: '203.0.113.5',
}))

vi.mock('next-auth', () => ({
  default: (config: { callbacks: { signIn: SignIn } }) => {
    state.captured = config
    return { handlers: {}, auth: vi.fn() }
  },
}))
vi.mock('next-auth/providers/google', () => ({ default: () => ({ id: 'google' }) }))
vi.mock('next-auth/providers/credentials', () => ({
  default: (config: { authorize: Authorize }) => {
    state.authorize = config.authorize
    return { id: 'qa' }
  },
}))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: state.host, 'x-forwarded-for': state.forwardedFor }),
}))

import './auth-config'
import { InMemoryRateLimitStore, setRateLimitStore } from './rate-limit'
import { QA_ADMIN_EMAIL, QA_LOGIN_MAX_ATTEMPTS } from './qa-login'

const signIn: SignIn = (args) => state.captured!.callbacks.signIn(args)

describe('Google signIn callback', () => {
  it('continues when Google returns email_verified true', async () => {
    expect(await signIn({ profile: { email_verified: true } })).toBe(true)
  })

  it('refuses when email_verified is false', async () => {
    expect(await signIn({ profile: { email_verified: false } })).toBe(false)
  })

  it('refuses when email_verified is missing', async () => {
    expect(await signIn({ profile: {} })).toBe(false)
    expect(await signIn({})).toBe(false)
  })

  it('allows the qa provider only when QA login is enabled for this host', async () => {
    delete process.env.QA_ADMIN_SECRET
    delete process.env.VERCEL_ENV
    expect(await signIn({ account: { provider: 'qa' } })).toBe(false)
    process.env.QA_ADMIN_SECRET = 'secret'
    process.env.VERCEL_ENV = 'preview'
    expect(await signIn({ account: { provider: 'qa' } })).toBe(true)
    process.env.VERCEL_ENV = 'production'
    expect(await signIn({ account: { provider: 'qa' } })).toBe(false)
  })
})

describe('QA credential authorize', () => {
  beforeEach(() => {
    setRateLimitStore(new InMemoryRateLimitStore())
    state.host = 'localhost:3000'
    state.forwardedFor = '203.0.113.5'
    process.env.QA_ADMIN_SECRET = 'qa-secret'
    delete process.env.VERCEL_ENV
  })

  it('accepts the secret on a dev host and rejects a wrong or different-length secret', async () => {
    expect(await state.authorize!({ secret: 'qa-secret' })).toEqual({
      id: 'qa-admin',
      email: QA_ADMIN_EMAIL,
      name: 'QA',
    })
    expect(await state.authorize!({ secret: 'nope' })).toBeNull()
    expect(await state.authorize!({ secret: 'qa-secret-extra' })).toBeNull()
    expect(await state.authorize!(undefined)).toBeNull()
  })

  it('stays off on the production host even with the right secret', async () => {
    state.host = 'www.quickprolist.com'
    expect(await state.authorize!({ secret: 'qa-secret' })).toBeNull()
    process.env.VERCEL_ENV = 'production'
    state.host = 'localhost:3000'
    expect(await state.authorize!({ secret: 'qa-secret' })).toBeNull()
  })

  it('rate-limits further attempts from the same IP', async () => {
    for (let i = 0; i < QA_LOGIN_MAX_ATTEMPTS; i++) {
      expect(await state.authorize!({ secret: 'wrong' })).toBeNull()
    }
    expect(await state.authorize!({ secret: 'qa-secret' })).toBeNull()

    state.forwardedFor = '203.0.113.9'
    expect(await state.authorize!({ secret: 'qa-secret' })).toEqual({
      id: 'qa-admin',
      email: QA_ADMIN_EMAIL,
      name: 'QA',
    })
  })
})
