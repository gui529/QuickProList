import { beforeEach, describe, expect, it, vi } from 'vitest'

const rows: { channel: string; value: string; reason: string }[] = []

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
    if (text.includes('channel = $1 AND value = $2')) {
      const [channel, value] = params as string[]
      return rows.filter((row) => row.channel === channel && row.value === value)
    }
    if (text.includes('split_part')) {
      const [domain] = params as string[]
      return rows
        .filter((row) => row.channel === 'email' && row.value.split('@')[1] === domain)
        .slice(0, 1)
    }
    if (text.includes('DELETE FROM suppressions')) return []
    return []
  },
}))

import { isFreeMailDomain } from './free-mail-domains'
import { sqlEmailSuppressedCheck } from './campaign-neon-queries'
import { addSuppression, emailCoveredBySuppression, isSuppressed } from './suppressions'

const FREE_MAIL = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'aol.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'comcast.net',
  'att.net',
  'bellsouth.net',
  'verizon.net',
  'charter.net',
  'cox.net',
  'protonmail.com',
]

describe('domain suppression at read time', () => {
  beforeEach(() => {
    rows.length = 0
  })

  it('covers every address on a company domain and only the exact free-mail address', async () => {
    await addSuppression('email', 'contact@itsbyjay.com', 'reply_opt_out')
    await addSuppression('email', 'opted.out@gmail.com', 'unsubscribe')

    expect(emailCoveredBySuppression('info@itsbyjay.com', ['contact@itsbyjay.com'])).toBe(true)
    expect(emailCoveredBySuppression('other.person@gmail.com', ['opted.out@gmail.com'])).toBe(false)
    expect(emailCoveredBySuppression('opted.out@gmail.com', ['opted.out@gmail.com'])).toBe(true)

    expect(await isSuppressed('email', 'info@itsbyjay.com')).toBe(true)
    expect(await isSuppressed('email', 'contact@itsbyjay.com')).toBe(true)
    expect(await isSuppressed('email', 'other.person@gmail.com')).toBe(false)
    expect(await isSuppressed('email', 'opted.out@gmail.com')).toBe(true)
    expect(await isSuppressed('sms', '+15551112222')).toBe(false)

    const companySql = sqlEmailSuppressedCheck('info@itsbyjay.com')
    expect(companySql).toContain("value = 'info@itsbyjay.com'")
    expect(companySql).toContain("lower(split_part(value, '@', 2)) = 'itsbyjay.com'")
    const gmailSql = sqlEmailSuppressedCheck('other.person@gmail.com')
    expect(gmailSql).toContain("value = 'other.person@gmail.com'")
    expect(gmailSql).not.toContain('split_part')
  })

  it('keeps free-mail and ISP domains off the domain rule', () => {
    for (const domain of FREE_MAIL) {
      expect(isFreeMailDomain(domain)).toBe(true)
      expect(emailCoveredBySuppression(`a@${domain}`, [`b@${domain}`])).toBe(false)
      expect(emailCoveredBySuppression(`a@${domain}`, [`a@${domain}`])).toBe(true)
    }
  })
})
