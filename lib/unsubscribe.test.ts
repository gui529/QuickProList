import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe'

/** Historical wire format: base64url(email).hmac. Still accepted forever. */
function legacyUnsubscribeToken(email: string, secret: string): string {
  const payload = Buffer.from(email.trim().toLowerCase()).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

describe('unsubscribe tokens', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'secret-a'
  })

  it('round-trips a normalized email in an opaque token', () => {
    const token = createUnsubscribeToken('  Owner@Example.COM ')
    expect(verifyUnsubscribeToken(token)).toBe('owner@example.com')
    expect(token.startsWith('v2.')).toBe(true)
    expect(token).not.toContain(Buffer.from('owner@example.com').toString('base64url'))
    expect(token).not.toContain('owner@example.com')
  })

  it('still accepts the old base64-of-email links', () => {
    const token = legacyUnsubscribeToken('Owner@Example.com', 'secret-a')
    expect(token.split('.')).toHaveLength(2)
    expect(verifyUnsubscribeToken(token)).toBe('owner@example.com')
  })

  it('rejects a tampered new token, a forged legacy payload, and garbage', () => {
    const token = createUnsubscribeToken('a@example.com')
    const [version, id, sig] = token.split('.')
    const flipped = `${version}.${id}.${sig.slice(0, -1)}${sig.endsWith('a') ? 'b' : 'a'}`
    expect(verifyUnsubscribeToken(flipped)).toBeNull()
    expect(verifyUnsubscribeToken(`${version}.${id}x.${sig}`)).toBeNull()

    const legacy = legacyUnsubscribeToken('a@example.com', 'secret-a')
    const [, legacySig] = legacy.split('.')
    const forged = `${Buffer.from('victim@example.com').toString('base64url')}.${legacySig}`
    expect(verifyUnsubscribeToken(forged)).toBeNull()
    expect(verifyUnsubscribeToken(token + 'x')).toBeNull()
    expect(verifyUnsubscribeToken('garbage')).toBeNull()
    expect(verifyUnsubscribeToken('')).toBeNull()
  })

  it('rejects tokens signed with a different secret', () => {
    const token = createUnsubscribeToken('a@example.com')
    const legacy = legacyUnsubscribeToken('a@example.com', 'secret-a')
    process.env.UNSUBSCRIBE_SECRET = 'secret-b'
    expect(verifyUnsubscribeToken(token)).toBeNull()
    expect(verifyUnsubscribeToken(legacy)).toBeNull()
  })

  it('fails closed when no secret is configured', () => {
    const token = createUnsubscribeToken('a@example.com')
    delete process.env.UNSUBSCRIBE_SECRET
    delete process.env.CRON_SECRET
    expect(verifyUnsubscribeToken(token)).toBeNull()
    expect(() => createUnsubscribeToken('a@example.com')).toThrow(/UNSUBSCRIBE_SECRET/)
  })
})
