import { describe, it, expect, vi } from 'vitest'

type SignIn = (args: { profile?: { email_verified?: boolean } }) => boolean | Promise<boolean>
const state = vi.hoisted(() => ({ captured: undefined as { callbacks: { signIn: SignIn } } | undefined }))

vi.mock('next-auth', () => ({
  default: (config: { callbacks: { signIn: SignIn } }) => {
    state.captured = config
    return { handlers: {}, auth: vi.fn() }
  },
}))
vi.mock('next-auth/providers/google', () => ({ default: () => ({ id: 'google' }) }))

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
})
