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

  it('explains a missing code', () => {
    expect(loginErrorMessage('missing_code')).toMatch(/incomplete/i)
  })

  it('explains expired links', () => {
    expect(loginErrorMessage('otp_expired')).toMatch(/expired/i)
    expect(loginErrorMessage('Email link is invalid or has expired')).toMatch(/expired/i)
  })

  it('explains a link opened in a different browser', () => {
    expect(loginErrorMessage('PKCE code verifier not found in storage')).toMatch(/same browser/i)
  })

  it('shows unknown errors, truncated', () => {
    expect(loginErrorMessage('boom')).toBe('Sign-in failed: boom')
    const long = loginErrorMessage('x'.repeat(500))!
    expect(long.length).toBeLessThan(260)
    expect(long.endsWith('…')).toBe(true)
  })
})
