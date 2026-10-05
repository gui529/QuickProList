import { describe, it, expect, vi, beforeEach } from 'vitest'

let session: { user?: { email?: string | null; id?: string } } | null = null
let configured = true
const authMock = vi.fn(async () => session)
let adminRow: { email: string } | null = null
const eq = vi.fn()

vi.mock('./auth-config', () => ({
  auth: () => authMock(),
  isAuthConfigured: () => configured,
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: string) => {
          eq(table, col, val)
          return { maybeSingle: async () => ({ data: adminRow, error: null }) }
        },
      }),
    }),
  }),
}))

import { getAdminSession, requireAdmin, AuthError } from './auth'

beforeEach(() => {
  session = null
  configured = true
  adminRow = null
  authMock.mockClear()
  eq.mockClear()
  process.env.SUPABASE_URL = 'https://x.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
})

describe('getAdminSession', () => {
  it('returns the Google subject as userId for an email in admins', async () => {
    session = { user: { email: 'admin@example.com', id: 'google-sub-1' } }
    adminRow = { email: 'admin@example.com' }
    expect(await getAdminSession()).toEqual({ email: 'admin@example.com', userId: 'google-sub-1' })
    expect(eq).toHaveBeenCalledWith('admins', 'email', 'admin@example.com')
  })

  it('falls back to the email when there is no subject', async () => {
    session = { user: { email: 'admin@example.com' } }
    adminRow = { email: 'admin@example.com' }
    expect((await getAdminSession())?.userId).toBe('admin@example.com')
  })

  it('is null for a Google account that is not in admins', async () => {
    session = { user: { email: 'rando@example.com', id: 's' } }
    expect(await getAdminSession()).toBeNull()
  })

  it('is null when signed out', async () => {
    expect(await getAdminSession()).toBeNull()
  })

  it('is null without calling Auth.js when auth env is missing', async () => {
    configured = false
    session = { user: { email: 'admin@example.com' } }
    adminRow = { email: 'admin@example.com' }
    expect(await getAdminSession()).toBeNull()
    expect(authMock).not.toHaveBeenCalled()
  })

  it('is null when Supabase env is missing', async () => {
    delete process.env.SUPABASE_URL
    session = { user: { email: 'admin@example.com' } }
    expect(await getAdminSession()).toBeNull()
  })
})

describe('requireAdmin', () => {
  it('resolves for an admin', async () => {
    session = { user: { email: 'admin@example.com', id: 'sub' } }
    adminRow = { email: 'admin@example.com' }
    expect(await requireAdmin()).toEqual({ email: 'admin@example.com', userId: 'sub' })
  })

  it('throws 401 when signed out', async () => {
    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 })
    await expect(requireAdmin()).rejects.toBeInstanceOf(AuthError)
  })

  it('throws 403 for a non-admin', async () => {
    session = { user: { email: 'rando@example.com' } }
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 })
  })
})
