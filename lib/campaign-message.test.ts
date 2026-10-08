import { describe, expect, it } from 'vitest'
import { expandCampaignMessage } from './campaign-message'

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
    expect(out).toContain('Marietta')
    expect(out).toContain('nearby towns')
  })
})
