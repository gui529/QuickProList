import { describe, expect, it, beforeEach, vi } from 'vitest'

const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn().mockResolvedValue('email_123'),
}))

vi.mock('./email', () => ({ sendEmail: sendEmailMock }))

// lib/reports.ts hits live Supabase directly; swap it for the in-memory
// test double (which itself composes lib/kv.test-double +
// lib/invitations.test-double) so this test can exercise real
// status-deriving logic without live credentials. Also swap lib/kv.ts and
// lib/invitations.ts themselves, since lib/winback.ts calls
// `setWinbackSent`/`createInvitation` directly (not just through reports).
vi.mock('./reports', async () => {
  const testDouble = await import('./reports.test-double')
  return { getBusinessReports: testDouble.getBusinessReports }
})
vi.mock('./kv', async () => {
  const testDouble = await import('./kv.test-double')
  return testDouble
})
vi.mock('./invitations', async () => {
  const testDouble = await import('./invitations.test-double')
  return testDouble
})

import { sendWinbackEmails } from './winback'
import { __reset as resetCurated, __seed as seedCurated, __all as allCurated } from './kv.test-double'
import { __reset as resetInvitations, __seed as seedInvitation } from './invitations.test-double'

describe('sendWinbackEmails (lib/winback.ts)', () => {
  beforeEach(() => {
    resetCurated()
    resetInvitations()
    sendEmailMock.mockClear()
  })

  it('emails an unconverted expired-trial business with a contact_email exactly once, citing its own stats', async () => {
    seedCurated({
      id: 'biz-expired',
      name: 'Acme Plumbing',
      category: 'plumbers',
      is_trial: true,
      trial_ends_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      contact_email: 'acme@example.com',
      search_impressions: 158,
      profile_views: 42,
    })

    const results = await sendWinbackEmails()

    expect(results).toEqual([
      { businessId: 'biz-expired', contactEmail: 'acme@example.com', emailId: 'email_123' },
    ])
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const [to, businessName, body, opts] = sendEmailMock.mock.calls[0]
    expect(to).toBe('acme@example.com')
    expect(businessName).toBe('Acme Plumbing')
    expect(body).toContain('158')
    expect(body).toContain('42')
    expect(opts.enrollUrl).toMatch(/\/enroll\//)
  })

  it('marks winback_sent_at on the business after sending', async () => {
    seedCurated({
      id: 'biz-expired',
      is_trial: true,
      trial_ends_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      contact_email: 'acme@example.com',
    })

    expect(allCurated().find((r) => r.id === 'biz-expired')?.winback_sent_at).toBeNull()

    await sendWinbackEmails()

    expect(allCurated().find((r) => r.id === 'biz-expired')?.winback_sent_at).not.toBeNull()
  })

  it('skips a business that already received a win-back email', async () => {
    seedCurated({
      id: 'biz-already-sent',
      is_trial: true,
      trial_ends_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      contact_email: 'acme@example.com',
      winback_sent_at: new Date().toISOString(),
    })

    const results = await sendWinbackEmails()

    expect(results).toHaveLength(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('skips businesses that are paid, trial, pending, canceled, or none even with a contact_email', async () => {
    seedCurated({ id: 'biz-none', is_trial: false, contact_email: 'none@example.com' })

    seedCurated({ id: 'biz-paid', is_trial: false, contact_email: 'paid@example.com' })
    seedInvitation({ curated_business_id: 'biz-paid', status: 'paid' })

    seedCurated({
      id: 'biz-trial',
      is_trial: true,
      trial_ends_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      contact_email: 'trial@example.com',
    })

    seedCurated({ id: 'biz-pending', is_trial: false, contact_email: 'pending@example.com' })
    seedInvitation({ curated_business_id: 'biz-pending', status: 'pending' })

    seedCurated({ id: 'biz-canceled', is_trial: false, contact_email: 'canceled@example.com' })
    seedInvitation({ curated_business_id: 'biz-canceled', status: 'canceled' })

    const results = await sendWinbackEmails()

    expect(results).toHaveLength(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('skips an expired-trial business with no contact_email on file', async () => {
    seedCurated({
      id: 'biz-no-email',
      is_trial: true,
      trial_ends_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      contact_email: null,
    })

    const results = await sendWinbackEmails()

    expect(results).toHaveLength(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
