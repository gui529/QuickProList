import { describe, expect, it } from 'vitest'
import { LISTED_MESSAGE } from './campaigns'
import { expandCampaignMessage } from './campaign-message'
import {
  assertCampaignPostalAddress,
  assertCampaignPreviewLinks,
  assertRecentBounceRate,
  assertRecipientDomainHasMx,
  CampaignPrepareError,
  recentDeliveryStatuses,
  renderCampaignManagerEmail,
} from './campaign-prepare'
import type { SentRegistryEntry } from './campaign-sent-registry'

const enroll = 'https://example.test/enroll/11111111-1111-4111-8111-111111111111'

function row(partial: Partial<SentRegistryEntry> & Pick<SentRegistryEntry, 'email' | 'deliveryStatus'>): SentRegistryEntry {
  return {
    businessName: 'Biz',
    city: 'atlanta',
    category: 'plumbing',
    batch: 'b',
    resendId: 'r',
    subject: 's',
    sentAt: '2026-10-17T00:00:00.000Z',
    wave: 'listed',
    ...partial,
  }
}

describe('prepare checks', () => {
  it('refuses to prepare a send-ready email without a postal address', () => {
    const previous = process.env.CAMPAIGN_POSTAL_ADDRESS
    delete process.env.CAMPAIGN_POSTAL_ADDRESS
    try {
      expect(() => assertCampaignPostalAddress()).toThrow(/CAMPAIGN_POSTAL_ADDRESS/)
      expect(() => assertCampaignPostalAddress('{postalAddress}')).toThrow(CampaignPrepareError)
      expect(() => assertCampaignPostalAddress('   ')).toThrow(/Do not invent one/)
      expect(assertCampaignPostalAddress('1 Test Street, Atlanta, GA 30301')).toBe(
        '1 Test Street, Atlanta, GA 30301'
      )
    } finally {
      if (previous === undefined) delete process.env.CAMPAIGN_POSTAL_ADDRESS
      else process.env.CAMPAIGN_POSTAL_ADDRESS = previous
    }
  })

  it('refuses a domain with no MX record', async () => {
    await expect(
      assertRecipientDomainHasMx('pro@missing.test', async () => {
        const err = new Error('no data') as NodeJS.ErrnoException
        err.code = 'ENODATA'
        throw err
      })
    ).rejects.toThrow(/no MX record/)

    await expect(assertRecipientDomainHasMx('pro@empty.test', async () => [])).rejects.toThrow(
      /no MX record/
    )
  })

  it('accepts a domain that has an MX record', async () => {
    await expect(
      assertRecipientDomainHasMx('owner@example.com', async () => [{ exchange: 'mx.example.com' }])
    ).resolves.toBeUndefined()
  })

  it('pauses when the recent bounce rate is above 5%', () => {
    const statuses = recentDeliveryStatuses([
      ...Array.from({ length: 6 }, (_, i) => row({ email: `ok${i}@example.com`, deliveryStatus: 'delivered' })),
      row({ email: 'a@example.com', deliveryStatus: 'bounced' }),
      row({ email: 'b@example.com', deliveryStatus: 'bounced' }),
      row({ email: 'owner@example.com', deliveryStatus: 'bounced', wave: 'test' }),
    ])
    expect(statuses).toHaveLength(8)
    expect(() => assertRecentBounceRate(statuses)).toThrow(CampaignPrepareError)
    expect(() => assertRecentBounceRate(statuses)).toThrow(/PAUSE/)
    expect(() => assertRecentBounceRate(statuses)).toThrow(/25%/)
  })

  it('allows a bounce rate at the 5% limit', () => {
    const statuses = [
      ...Array.from({ length: 19 }, () => 'delivered' as const),
      'bounced' as const,
    ]
    expect(() => assertRecentBounceRate(statuses)).not.toThrow()
  })

  it('refuses a link-below email that has no enroll link', () => {
    expect(() => assertCampaignPreviewLinks('Use the link below.', '<p>Use the link below.</p>')).toThrow(
      /link below/
    )
  })

  it('renders listed mail with exactly one preview link and the price after it', () => {
    process.env.UNSUBSCRIBE_SECRET = 'test-unsub-secret'
    process.env.SITE_URL = 'https://example.test'
    const body = expandCampaignMessage(LISTED_MESSAGE, {
      businessName: 'Paces Construction',
      city: 'atlanta',
      category: 'generalcontractors',
    })
    expect(body).not.toContain('Contractors pros')
    const rendered = renderCampaignManagerEmail({
      to: 'owner@paces.example',
      businessName: 'Paces Construction',
      city: 'atlanta',
      category: 'generalcontractors',
      wave: 'listed',
      enrollUrl: enroll,
      siteUrl: 'https://example.test',
    })
    expect(() => assertCampaignPreviewLinks(rendered.text, rendered.html)).not.toThrow()
    expect(rendered.text).toContain(enroll)
    expect(rendered.text.match(/\/enroll\//g)).toHaveLength(1)
    expect(rendered.text).not.toContain('/search?')
    expect(rendered.text).toContain('$29.99/month')
    expect(rendered.text.indexOf('$29.99/month')).toBeGreaterThan(rendered.text.indexOf(enroll))
    expect(rendered.text).not.toContain('launch soon')
    expect(rendered.text).not.toContain('one-time')
    expect(rendered.subject).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})
