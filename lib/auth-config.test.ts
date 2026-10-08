import { describe, it, expect, vi } from 'vitest'

type SignIn = (args: {
  profile?: { email_verified?: boolean }
  account?: { provider?: string }
}) => boolean | Promise<boolean>
const state = vi.hoisted(() => ({ captured: undefined as { callbacks: { signIn: SignIn } } | undefined }))

vi.mock('next-auth', () => ({
  default: (config: { callbacks: { signIn: SignIn } }) => {
    state.captured = config
    return { handlers: {}, auth: vi.fn() }
  },
}))
vi.mock('next-auth/providers/google', () => ({ default: () => ({ id: 'google' }) }))
vi.mock('next-auth/providers/credentials', () => ({ default: () => ({ id: 'qa' }) }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: 'localhost:3000' }),
}))

import './auth-config'

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
