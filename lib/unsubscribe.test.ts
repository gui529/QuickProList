import { beforeEach, describe, expect, it } from 'vitest'
import { createUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe'

describe('unsubscribe tokens', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'secret-a'
  })

  it('round-trips a normalized email', () => {
    expect(verifyUnsubscribeToken(createUnsubscribeToken('  Owner@Example.COM '))).toBe(
      'owner@example.com'
    )
  })

  it('rejects a tampered payload or signature', () => {
    const token = createUnsubscribeToken('a@example.com')
    const [, sig] = token.split('.')
    const forged = `${Buffer.from('victim@example.com').toString('base64url')}.${sig}`
    expect(verifyUnsubscribeToken(forged)).toBeNull()
    expect(verifyUnsubscribeToken(token + 'x')).toBeNull()
    expect(verifyUnsubscribeToken('garbage')).toBeNull()
    expect(verifyUnsubscribeToken('')).toBeNull()
  })

  it('rejects tokens signed with a different secret', () => {
    const token = createUnsubscribeToken('a@example.com')
    process.env.UNSUBSCRIBE_SECRET = 'secret-b'
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })
})
