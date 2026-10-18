import { describe, expect, it } from 'vitest'
import { expandCampaignMessage } from './campaign-message'
import { LISTED_MESSAGE } from './campaigns'

describe('expandCampaignMessage', () => {
  it('replaces placeholders with formatted labels', () => {
    const out = expandCampaignMessage(
      'Hi {businessName} in {city} for {category}. {signature}',
      { businessName: "Joe's Plumbing", city: 'marietta', category: 'plumbing' }
    )
    expect(out).toContain("Joe's Plumbing")
    expect(out).toContain('Marietta')
    expect(out).toContain('Plumbers')
    expect(out).toContain('— The QuickProList team')
  })

  it('uses fallbacks when city or category missing', () => {
    const out = expandCampaignMessage('{city} / {category}', { businessName: 'Biz' })
    expect(out).toContain('your area')
    expect(out).toContain('home-service')
  })

  it('expands {areas} from open towns', () => {
    const out = expandCampaignMessage('{areas}', { businessName: 'Biz', city: 'marietta' })
    expect(out).toContain('Atlanta')
    expect(out).toContain('Marietta')
    expect(out).toContain('nearby towns')
  })

  it('expands {senderIntro} from CAMPAIGN_SENDER_NAME', () => {
    process.env.CAMPAIGN_SENDER_NAME = 'Jeremy'
    const out = expandCampaignMessage('{senderIntro}', { businessName: 'Biz' })
    expect(out).toBe("I'm Jeremy with QuickProList")
    delete process.env.CAMPAIGN_SENDER_NAME
  })

  it('does not render a doubled profession after {category} pros', () => {
    expect(
      expandCampaignMessage('{category} pros', {
        businessName: 'Paces',
        city: 'atlanta',
        category: 'generalcontractors',
      })
    ).toBe('Contractors')
    expect(
      expandCampaignMessage('{category} pros', {
        businessName: 'Colony',
        city: 'atlanta',
        category: 'roofing',
      })
    ).toBe('Roofers')
    expect(
      expandCampaignMessage('{category} pros', {
        businessName: 'Peppers',
        city: 'atlanta',
        category: 'airconditioningheating',
      })
    ).toBe('HVAC pros')
  })

  it('opens listed copy with the business and does not embed a search URL', () => {
    const out = expandCampaignMessage(LISTED_MESSAGE, {
      businessName: 'Colony Roofers',
      city: 'atlanta',
      category: 'roofing',
    })
    expect(out.startsWith('Colony Roofers')).toBe(true)
    expect(out).not.toContain('Roofers pros')
    expect(out).not.toContain('/search?')
    expect(out).toContain('link below')
  })

  it('expands {siteUrl} from SITE_URL', () => {
    process.env.SITE_URL = 'https://example.test/'
    const out = expandCampaignMessage('Visit {siteUrl}', { businessName: 'Biz' })
    expect(out).toBe('Visit https://example.test')
    delete process.env.SITE_URL
  })
})
