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
    const res = await POST(makeRequest({ token: 'abc' }) as never)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.curatedBusinessId).toBe('cur-1')
    expect(data.dashboardToken).toBeNull()
    expect(activateMock).toHaveBeenCalledWith('abc', null)
  })

  it('returns dashboardToken when the pro dashboard flag is on', async () => {
    process.env.PRO_DASHBOARD_ENABLED = 'true'
    const res = await POST(makeRequest({ token: 'abc' }) as never)
    const data = await res.json()
    expect(data.dashboardToken).toBe('dash-1')
  })

  it('requires token', async () => {
    const res = await POST(makeRequest({}) as never)
    expect(res.status).toBe(400)
  })
})
