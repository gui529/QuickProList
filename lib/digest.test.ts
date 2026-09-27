import { describe, expect, it, beforeEach, vi } from 'vitest'

const { sendDigestEmailMock } = vi.hoisted(() => ({
  sendDigestEmailMock: vi.fn().mockResolvedValue('email_123'),
}))

vi.mock('./email', () => ({ sendDigestEmail: sendDigestEmailMock }))

// lib/reports.ts hits live Supabase directly; swap it for the in-memory
// test double (which itself composes lib/kv.test-double +
// lib/invitations.test-double) so this test can exercise real
// status-deriving logic without live credentials.
vi.mock('./reports', async () => {
  const testDouble = await import('./reports.test-double')
  return { getBusinessReports: testDouble.getBusinessReports }
})

import { sendPerformanceDigests } from './digest'
import { __reset as resetCurated, __seed as seedCurated } from './kv.test-double'
import { __reset as resetInvitations, __seed as seedInvitation } from './invitations.test-double'

describe('sendPerformanceDigests (lib/digest.ts)', () => {
  beforeEach(() => {
    resetCurated()
    resetInvitations()
    sendDigestEmailMock.mockClear()
  })

  it('composes a digest containing every stat field for a paid business with a contact_email', async () => {
    seedCurated({
      id: 'biz-paid',
      name: 'Acme Plumbing',
      contact_email: 'acme@example.com',
      is_trial: false,
      search_impressions: 158,
      profile_views: 42,
      phone_clicks: 7,
      website_clicks: 3,
      directions_clicks: 1,
    })
    seedInvitation({ curated_business_id: 'biz-paid', status: 'paid' })

    const results = await sendPerformanceDigests()

    expect(results).toEqual([
      { businessId: 'biz-paid', contactEmail: 'acme@example.com', emailId: 'email_123' },
    ])
    expect(sendDigestEmailMock).toHaveBeenCalledTimes(1)
    expect(sendDigestEmailMock).toHaveBeenCalledWith('acme@example.com', 'Acme Plumbing', {
      searchImpressions: 158,
      profileViews: 42,
      phoneClicks: 7,
      websiteClicks: 3,
      directionsClicks: 1,
    })
  })

  it('also emails an active-trial business with a contact_email', async () => {
    seedCurated({
      id: 'biz-trial',
      name: 'Bob Electric',
      contact_email: 'bob@example.com',
      is_trial: true,
      trial_ends_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      search_impressions: 20,
      profile_views: 10,
      phone_clicks: 2,
      website_clicks: 1,
      directions_clicks: 0,
    })

    const results = await sendPerformanceDigests()

    expect(results).toHaveLength(1)
    expect(results[0].businessId).toBe('biz-trial')
    expect(sendDigestEmailMock).toHaveBeenCalledWith('bob@example.com', 'Bob Electric', {
      searchImpressions: 20,
      profileViews: 10,
      phoneClicks: 2,
      websiteClicks: 1,
      directionsClicks: 0,
    })
  })

  it('skips a paid business with no contact_email', async () => {
    seedCurated({ id: 'biz-no-email', is_trial: false, contact_email: null })
    seedInvitation({ curated_business_id: 'biz-no-email', status: 'paid' })

    const results = await sendPerformanceDigests()

    expect(results).toHaveLength(0)
    expect(sendDigestEmailMock).not.toHaveBeenCalled()
  })

  it('skips businesses that are none, pending, canceled, or expired-trial even with a contact_email', async () => {
    seedCurated({ id: 'biz-none', is_trial: false, contact_email: 'none@example.com' })

    seedCurated({ id: 'biz-pending', is_trial: false, contact_email: 'pending@example.com' })
    seedInvitation({ curated_business_id: 'biz-pending', status: 'pending' })

    seedCurated({ id: 'biz-canceled', is_trial: false, contact_email: 'canceled@example.com' })
    seedInvitation({ curated_business_id: 'biz-canceled', status: 'canceled' })

    seedCurated({
      id: 'biz-expired',
      is_trial: true,
      trial_ends_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      contact_email: 'expired@example.com',
    })

    const results = await sendPerformanceDigests()

    expect(results).toHaveLength(0)
    expect(sendDigestEmailMock).not.toHaveBeenCalled()
  })
})
