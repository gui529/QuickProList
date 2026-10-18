import { beforeEach, describe, expect, it, vi } from 'vitest'

const rows: { channel: string; value: string; reason: string }[] = []
const sendMock = vi.fn(async () => ({ data: { id: 'email_123' }, error: null }))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

vi.mock('./db', () => ({
  isDatabaseConfigured: () => true,
  query: async (text: string, params: unknown[] = []) => {
    if (text.includes('INSERT INTO suppressions')) {
      const [channel, value, reason] = params as string[]
      const existing = rows.find((row) => row.channel === channel && row.value === value)
      if (existing) existing.reason = reason
      else rows.push({ channel, value, reason })
      return []
    }
    if (text.includes('SELECT value FROM suppressions WHERE channel = $1 AND value = $2')) {
      const [channel, value] = params as string[]
      return rows.filter((row) => row.channel === channel && row.value === value)
    }
    return []
  },
}))

import { sendEmail } from './email'
import { recordReplyOptOuts } from './gmail-campaign'
import { addSuppression } from './suppressions'

describe('Gmail reply opt-out blocks Resend', () => {
  beforeEach(() => {
    rows.length = 0
    sendMock.mockClear()
    process.env.RESEND_API_KEY = 'test_key'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'
    process.env.UNSUBSCRIBE_SECRET = 'test-unsub-secret'
    process.env.SITE_URL = 'https://example.test'
  })

  it('writes the reply to the suppressions table sendEmail already checks', async () => {
    await recordReplyOptOuts([{ fromEmail: 'Owner <Owner@Ready.example>', body: 'not interested' }], {
      addSuppression,
    })

    await expect(sendEmail('owner@ready.example', 'Ready Plumbing', 'Hello')).rejects.toThrow(
      /do-not-contact/
    )
    expect(rows).toEqual([
      { channel: 'email', value: 'owner@ready.example', reason: 'reply_opt_out' },
    ])
    expect(sendMock).not.toHaveBeenCalled()
  })
})
