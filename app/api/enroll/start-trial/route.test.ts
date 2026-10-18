import { describe, expect, it, beforeEach, vi } from 'vitest'

vi.mock('@/lib/enrollment-trial', () => ({
  activateEnrollmentTrial: vi.fn(),
  EnrollmentTrialError: class EnrollmentTrialError extends Error {
    code = 'not_found'
    status = 404
  },
}))

import { POST } from './route'
import { activateEnrollmentTrial } from '@/lib/enrollment-trial'

const activateMock = vi.mocked(activateEnrollmentTrial)

function makeRequest(body: unknown): Request {
  return new Request('https://example.test/api/enroll/start-trial', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/enroll/start-trial', () => {
  beforeEach(() => {
    delete process.env.PRO_DASHBOARD_ENABLED
    activateMock.mockReset()
    activateMock.mockResolvedValue({
      curatedBusinessId: 'cur-1',
      dashboardToken: 'dash-1',
      trialEndsAt: '2099-01-01T00:00:00.000Z',
    })
  })

  it('returns trial metadata when activation succeeds', async () => {
    const res = await POST(
      makeRequest({ token: '22222222-2222-4222-8222-222222222222', email: 'owner@acme.test' }) as never
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.curatedBusinessId).toBe('cur-1')
    expect(data.dashboardToken).toBeNull()
    expect(activateMock).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222', 'owner@acme.test')
  })

  it('requires an email for preview reminders', async () => {
    const missing = await POST(makeRequest({ token: 'abc' }) as never)
    expect(missing.status).toBe(400)
    expect((await missing.json()).error).toBe('Enter an email for preview reminders.')

    const invalid = await POST(makeRequest({ token: 'abc', email: 'nope' }) as never)
    expect(invalid.status).toBe(400)
    expect((await invalid.json()).error).toBe('Enter a valid email for preview reminders.')
    expect(activateMock).not.toHaveBeenCalled()
  })

  it('returns 404 for a non-UUID token without starting a trial', async () => {
    const res = await POST(makeRequest({ token: 'abc', email: 'owner@acme.test' }) as never)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Invitation not found', code: 'not_found' })
    expect(activateMock).not.toHaveBeenCalled()
  })

  it('returns dashboardToken when the pro dashboard flag is on', async () => {
    process.env.PRO_DASHBOARD_ENABLED = 'true'
    const res = await POST(
      makeRequest({ token: '22222222-2222-4222-8222-222222222222', email: 'owner@acme.test' }) as never
    )
    const data = await res.json()
    expect(data.dashboardToken).toBe('dash-1')
  })

  it('requires token', async () => {
    const res = await POST(makeRequest({}) as never)
    expect(res.status).toBe(400)
  })
})
