import { describe, expect, it, beforeEach, vi } from 'vitest'

// Route lib/stripe.ts's dependencies at the in-memory test doubles instead
// of the real Supabase-backed modules, per QPL-001's pattern.
vi.mock('./invitations', async () => import('./invitations.test-double'))
vi.mock('./kv', async () => import('./kv.test-double'))

import { handleSubscriptionCanceled } from './stripe'
import {
  __reset as resetInvitations,
  __seed as seedInvitation,
  getInvitationById,
} from './invitations.test-double'
import {
  __reset as resetCurated,
  __seed as seedCurated,
  getCurated,
} from './kv.test-double'

describe('handleSubscriptionCanceled (lib/stripe.ts)', () => {
  beforeEach(() => {
    resetInvitations()
    resetCurated()
    vi.clearAllMocks()
  })

  it('marks the invitation canceled and hides the curated row from getCurated on subscription.deleted', async () => {
    const curated = seedCurated({ category: 'plumbing', cities: ['austin'] })
    const invitation = seedInvitation({
      status: 'paid',
      stripe_subscription_id: 'sub_123',
      curated_business_id: curated.id,
    })

    // Sanity check: visible before cancellation.
    expect((await getCurated('plumbing', 'austin')).map((b) => b.id)).toContain(curated.id)

    await handleSubscriptionCanceled('sub_123')

    const updatedInvitation = await getInvitationById(invitation.id)
    expect(updatedInvitation?.status).toBe('canceled')
    expect(updatedInvitation?.canceled_at).not.toBeNull()

    const results = await getCurated('plumbing', 'austin')
    expect(results.map((b) => b.id)).not.toContain(curated.id)
  })

  it('is a no-op when no invitation matches the subscription id', async () => {
    await expect(handleSubscriptionCanceled('sub_unknown')).resolves.not.toThrow()
  })

  it('marks the invitation canceled even when it has no linked curated business', async () => {
    const invitation = seedInvitation({ status: 'paid', stripe_subscription_id: 'sub_456' })

    await handleSubscriptionCanceled('sub_456')

    const updated = await getInvitationById(invitation.id)
    expect(updated?.status).toBe('canceled')
  })

  it('does not error when re-processing an already-canceled invitation (retry safety)', async () => {
    const curated = seedCurated({ category: 'roofing', cities: ['dallas'] })
    seedInvitation({
      status: 'canceled',
      stripe_subscription_id: 'sub_789',
      curated_business_id: curated.id,
    })

    await expect(handleSubscriptionCanceled('sub_789')).resolves.not.toThrow()

    const results = await getCurated('roofing', 'dallas')
    expect(results.map((b) => b.id)).not.toContain(curated.id)
  })
})
