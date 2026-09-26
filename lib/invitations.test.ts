import { describe, expect, it, beforeEach } from 'vitest'
import {
  __reset,
  __seed,
  createInvitation,
  createTrialInvitation,
  deleteInvitation,
  getInvitationById,
  getInvitationByToken,
  isInvitationExpired,
  listInvitations,
  listPaidInvitations,
  markInvitationCanceled,
  markInvitationPaid,
} from './invitations.test-double'

describe('lib/invitations.ts (in-memory test double)', () => {
  beforeEach(() => {
    __reset()
  })

  it('createInvitation stores a pending invitation retrievable by token', async () => {
    const token = await createInvitation({
      businessName: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['austin', 'dallas', 'houston'],
      monthlyPrice: 29.99,
    })

    const invitation = await getInvitationByToken(token)
    expect(invitation).not.toBeNull()
    expect(invitation?.status).toBe('pending')
    expect(invitation?.cities).toEqual(['austin', 'dallas', 'houston'])
    expect(invitation?.business_name).toBe('Acme Plumbing')
  })

  it('markInvitationPaid transitions status and records Stripe/curated ids', async () => {
    const token = await createInvitation({
      businessName: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['austin'],
      monthlyPrice: 29.99,
    })

    await markInvitationPaid(token, 'cs_test_123', 'sub_test_456', 'curated-1')

    const invitation = await getInvitationByToken(token)
    expect(invitation?.status).toBe('paid')
    expect(invitation?.stripe_session_id).toBe('cs_test_123')
    expect(invitation?.stripe_subscription_id).toBe('sub_test_456')
    expect(invitation?.curated_business_id).toBe('curated-1')
  })

  it('markInvitationCanceled sets status and canceled_at by id', async () => {
    const seeded = __seed({ status: 'paid', curated_business_id: 'curated-2' })

    await markInvitationCanceled(seeded.id)

    const invitation = await getInvitationById(seeded.id)
    expect(invitation?.status).toBe('canceled')
    expect(invitation?.canceled_at).not.toBeNull()
  })

  it('listPaidInvitations only returns paid and canceled invitations', async () => {
    __seed({ status: 'pending' })
    const paid = __seed({ status: 'paid' })
    const canceled = __seed({ status: 'canceled' })
    __seed({ status: 'trial' })

    const results = await listPaidInvitations()

    expect(results.map((i) => i.id).sort()).toEqual([paid.id, canceled.id].sort())
  })

  it('createTrialInvitation stores a trial invitation linked to a curated business', async () => {
    await createTrialInvitation({
      businessName: 'Trial Business',
      category: 'roofing',
      cities: ['seattle'],
      trialEndsAt: '2099-01-01T00:00:00.000Z',
      curatedBusinessId: 'curated-3',
    })

    const all = await listInvitations()
    expect(all).toHaveLength(1)
    expect(all[0].status).toBe('trial')
    expect(all[0].curated_business_id).toBe('curated-3')
    expect(all[0].trial_ends_at).toBe('2099-01-01T00:00:00.000Z')
  })

  it('deleteInvitation removes the invitation so it can no longer be found', async () => {
    const seeded = __seed()

    await deleteInvitation(seeded.id)

    expect(await getInvitationById(seeded.id)).toBeNull()
    expect(await listInvitations()).toHaveLength(0)
  })

  describe('isInvitationExpired', () => {
    it('treats a pending invitation with a past expires_at as expired', () => {
      const invitation = __seed({
        status: 'pending',
        expires_at: new Date(Date.now() - 1000).toISOString(),
      })

      expect(isInvitationExpired(invitation)).toBe(true)
    })

    it('treats a pending invitation with a future expires_at as not expired', () => {
      const invitation = __seed({
        status: 'pending',
        expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      })

      expect(isInvitationExpired(invitation)).toBe(false)
    })

    it('treats an invitation already marked status: expired as expired regardless of expires_at', () => {
      const invitation = __seed({
        status: 'expired',
        expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      })

      expect(isInvitationExpired(invitation)).toBe(true)
    })

    it('does not treat a paid invitation with a past expires_at as expired', () => {
      const invitation = __seed({
        status: 'paid',
        expires_at: new Date(Date.now() - 1000).toISOString(),
      })

      expect(isInvitationExpired(invitation)).toBe(false)
    })

    it('does not treat a trial invitation with a past expires_at as expired', () => {
      const invitation = __seed({
        status: 'trial',
        expires_at: new Date(Date.now() - 1000).toISOString(),
      })

      expect(isInvitationExpired(invitation)).toBe(false)
    })
  })
})
