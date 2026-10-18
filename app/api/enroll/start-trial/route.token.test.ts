import { beforeEach, describe, expect, it, vi } from 'vitest'

const { queryMock, sendEmailMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  sendEmailMock: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
}))

vi.mock('@/lib/db', () => ({
  isDatabaseConfigured: () => true,
  query: (...args: unknown[]) => queryMock(...args),
}))

vi.mock('@/lib/kv', () => ({
  addCuratedFromYelp: vi.fn(async () => {}),
  addCuratedManual: vi.fn(async () => {}),
  findCuratedIdByYelpId: vi.fn(async () => ''),
  findLatestManualCuratedId: vi.fn(async () => 'cur-1'),
  getCuratedById: vi.fn(async () => ({ id: 'cur-1', dashboardToken: 'dash-1' })),
  publishCurated: vi.fn(async () => {}),
  setCuratedContactEmail: vi.fn(async () => {}),
  setCuratedTrial: vi.fn(async () => {}),
}))

vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}))

import { POST } from './route'

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
    contact_email: 'owner@acme.test',
  }
}

function makeRequest(body: unknown, ip: string): Request {
  return new Request('https://example.test/api/enroll/start-trial', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/enroll/start-trial token lookup', () => {
  beforeEach(() => {
    queryMock.mockReset()
    sendEmailMock.mockClear()
    delete process.env.PRO_DASHBOARD_ENABLED
    queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      const text = String(sql)
      if (text.includes('WHERE token = $1')) {
        return params[0] === KNOWN_TOKEN && text.includes('SELECT') ? [invitationRow(KNOWN_TOKEN)] : []
      }
      if (text.includes('ORDER BY created_at')) return [invitationRow(KNOWN_TOKEN)]
      return []
    })
  })

  it.each(['abc', 'not-a-uuid', '123'])(
    'returns 404 for non-UUID token %s without querying',
    async (token) => {
      const res = await POST(makeRequest({ token, email: 'owner@acme.test' }, `10.8.0.${token.length}`) as never)
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: 'Invitation not found', code: 'not_found' })
      expect(queryMock).not.toHaveBeenCalled()
      expect(sendEmailMock).not.toHaveBeenCalled()
    }
  )

  it('returns 404 when a valid UUID matches no invitation', async () => {
    const res = await POST(makeRequest({ token: UNKNOWN_TOKEN, email: 'owner@acme.test' }, '10.8.1.1') as never)
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: 'Invitation not found', code: 'not_found' })
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE token = $1'), [UNKNOWN_TOKEN])
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('starts the preview for a valid token that exists', async () => {
    const res = await POST(makeRequest({ token: KNOWN_TOKEN, email: 'owner@acme.test' }, '10.8.1.2') as never)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.curatedBusinessId).toBe('cur-1')
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE token = $1'), [KNOWN_TOKEN])
    expect(sendEmailMock).toHaveBeenCalled()
  })
})
