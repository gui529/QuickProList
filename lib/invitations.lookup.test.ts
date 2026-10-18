import { beforeEach, describe, expect, it, vi } from 'vitest'

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}))

vi.mock('./db', () => ({
  isDatabaseConfigured: () => Boolean(process.env.DATABASE_URL),
  query: (...args: unknown[]) => queryMock(...args),
}))

import { getInvitationByToken } from './invitations'

const KNOWN_TOKEN = '22222222-2222-4222-8222-222222222222'
const UNKNOWN_TOKEN = '11111111-1111-4111-8111-111111111111'

function invitationRow(token: string) {
  return {
    id: '6b1b3c2e-8f4a-4c1d-9a2b-111111111111',
    token,
    business_name: 'Acme Plumbing',
    yelp_id: null,
    yelp_data: null,
    category: 'plumbing',
    cities: ['austin'],
    monthly_price: '29.99',
    status: 'pending',
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    expires_at: '2099-01-01T00:00:00.000Z',
    canceled_at: null,
    trial_ends_at: null,
    contact_email: null,
  }
}

describe('getInvitationByToken (uuid column)', () => {
  beforeEach(() => {
    queryMock.mockReset()
    process.env.DATABASE_URL = 'postgres://test'
  })

  it.each(['abc', '123', 'invalid-token-xyz'])(
    'returns null for non-UUID token %s without querying',
    async (token) => {
      queryMock.mockRejectedValue(Object.assign(new Error('invalid input syntax for type uuid'), { code: '22P02' }))

      await expect(getInvitationByToken(token)).resolves.toBeNull()
      expect(queryMock).not.toHaveBeenCalled()
    }
  )

  it('returns null when a valid UUID matches no invitation', async () => {
    queryMock.mockResolvedValue([])

    await expect(getInvitationByToken(UNKNOWN_TOKEN)).resolves.toBeNull()
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('enrollment_invitations'),
      [UNKNOWN_TOKEN]
    )
  })

  it('returns the invitation for a known UUID token', async () => {
    queryMock.mockResolvedValue([invitationRow(KNOWN_TOKEN)])

    const invitation = await getInvitationByToken(KNOWN_TOKEN)

    expect(invitation?.business_name).toBe('Acme Plumbing')
    expect(invitation?.status).toBe('pending')
    expect(invitation?.monthly_price).toBe(29.99)
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE token = $1'), [KNOWN_TOKEN])
  })

  it('treats a uuid cast error as a missing invitation', async () => {
    queryMock.mockRejectedValue(
      Object.assign(new Error('invalid input syntax for type uuid: "not-a-uuid"'), { code: '22P02' })
    )

    await expect(getInvitationByToken(KNOWN_TOKEN)).resolves.toBeNull()
  })

  it('still throws unexpected database errors', async () => {
    queryMock.mockRejectedValue(new Error('connection refused'))

    await expect(getInvitationByToken(KNOWN_TOKEN)).rejects.toThrow('connection refused')
  })
})
