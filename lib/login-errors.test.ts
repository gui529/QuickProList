import { describe, it, expect } from 'vitest'
import { loginErrorMessage } from './login-errors'

describe('loginErrorMessage', () => {
  it('returns null when there is no error', () => {
    expect(loginErrorMessage(null)).toBeNull()
    expect(loginErrorMessage(undefined)).toBeNull()
    expect(loginErrorMessage('  ')).toBeNull()
  })

  it('explains a non-admin bounce', () => {
    expect(loginErrorMessage('not_an_admin')).toMatch(/not on the admin list/i)
  })

  it('explains Auth.js error codes', () => {
    expect(loginErrorMessage('AccessDenied')).toMatch(/not approved/i)
    expect(loginErrorMessage('Configuration')).toMatch(/not configured/i)
  })

  it('shows unknown errors, truncated', () => {
    expect(loginErrorMessage('boom')).toBe('Sign-in failed: boom')
    const long = loginErrorMessage('x'.repeat(500))!
    expect(long.length).toBeLessThan(260)
    expect(long.endsWith('…')).toBe(true)
  })
})
