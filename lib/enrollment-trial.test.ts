import { describe, expect, it, beforeEach, vi } from 'vitest'

vi.mock('./invitations', () => import('./invitations.test-double'))
vi.mock('./kv', () => import('./kv.test-double'))
vi.mock('./email', () => ({
  sendEmail: vi.fn().mockResolvedValue('email-id'),
}))

import { __reset as resetInvitations, __seed as seedInvitation, getInvitationByToken } from './invitations.test-double'
import { __reset as resetCurated, __all as allCurated } from './kv.test-double'
import { activateEnrollmentTrial, enrollPreviewTrialDays } from './enrollment-trial'

describe('activateEnrollmentTrial', () => {
  beforeEach(() => {
    resetInvitations()
    resetCurated()
  })

  it('creates a live trial listing from a pending invitation', async () => {
    const inv = seedInvitation({
      token: 'tok-1',
      status: 'pending',
      business_name: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['marietta'],
      monthly_price: 29.99,
    })

    const result = await activateEnrollmentTrial(inv.token)

    expect(result.curatedBusinessId).toBeTruthy()
    expect(result.trialEndsAt).toBeTruthy()

    const curated = allCurated()
    expect(curated).toHaveLength(1)
    expect(curated[0].name).toBe('Acme Plumbing')
    expect(curated[0].is_trial).toBe(true)
    expect(curated[0].trial_ends_at).toBeTruthy()

    const updated = await getInvitationByToken('tok-1')
    expect(updated?.status).toBe('trial')
    expect(updated?.curated_business_id).toBe(result.curatedBusinessId)
  })

  it('is idempotent when trial already started', async () => {
    seedInvitation({
      token: 'tok-2',
      status: 'trial',
      curated_business_id: 'cur-1',
      trial_ends_at: '2099-01-01T00:00:00.000Z',
    })

    const result = await activateEnrollmentTrial('tok-2')
    expect(result.curatedBusinessId).toBe('cur-1')
    expect(allCurated()).toHaveLength(0)
  })

  it('defaults preview length to 30 days', () => {
    delete process.env.ENROLL_PREVIEW_TRIAL_DAYS
    expect(enrollPreviewTrialDays()).toBe(30)
  })
})
