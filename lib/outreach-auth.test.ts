import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { isValidOutreachBearer } from './outreach-bearer'

describe('isValidOutreachBearer', () => {
  beforeEach(() => {
    process.env.CAMPAIGN_OUTREACH_SECRET = 'test-secret'
  })
  afterEach(() => {
    delete process.env.CAMPAIGN_OUTREACH_SECRET
  })

  it('accepts matching bearer', () => {
    const req = new NextRequest('https://example.test/api/campaigns/send', {
      headers: { authorization: 'Bearer test-secret' },
    })
    expect(isValidOutreachBearer(req)).toBe(true)
  })

  it('rejects wrong bearer', () => {
    const req = new NextRequest('https://example.test/api/campaigns/send', {
      headers: { authorization: 'Bearer wrong' },
    })
    expect(isValidOutreachBearer(req)).toBe(false)
  })
})
