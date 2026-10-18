import { readFileSync } from 'node:fs'
import { describe, expect, it, beforeEach, vi } from 'vitest'

const { sendTrialRemindersMock } = vi.hoisted(() => ({
  sendTrialRemindersMock: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/trial-reminder', () => ({
  sendTrialReminders: sendTrialRemindersMock,
}))

import { GET } from './route'

describe('GET /api/cron/trial-reminder', () => {
  beforeEach(() => {
    sendTrialRemindersMock.mockClear()
    process.env.CRON_SECRET = 'cron-secret'
  })

  it('returns 401 without auth', async () => {
    const res = await GET(
      new Request('https://example.test/api/cron/trial-reminder') as never
    )
    expect(res.status).toBe(401)
  })

  it('sends reminders with valid secret', async () => {
    sendTrialRemindersMock.mockResolvedValue([{ businessId: 'b1' }])
    const res = await GET(
      new Request('https://example.test/api/cron/trial-reminder', {
        headers: { authorization: 'Bearer cron-secret' },
      }) as never
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sent).toBe(1)
  })
})

describe('trial reminder production schedule', () => {
  it('is declared in vercel.json, which is the cron config shipped with a deployment', () => {
    const config = JSON.parse(readFileSync(new URL('../../../../vercel.json', import.meta.url), 'utf8')) as {
      crons: Array<{ path: string; schedule: string }>
    }
    expect(config.crons).toContainEqual({
      path: '/api/cron/trial-reminder',
      schedule: '0 15 * * *',
    })
  })
})
