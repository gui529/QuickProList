import { describe, expect, it } from 'vitest'
import type { Business } from './business'
import { toPublicBusiness } from './public-business'

function business(): Business {
  return {
    id: 'biz-1',
    source: 'manual',
    yelpId: 'yelp-1',
    name: 'Acme Plumbing',
    rating: 4.5,
    reviewCount: 12,
    phone: '555-0100',
    address: '1 Main St, Marietta, GA',
    imageUrl: 'https://example.test/photo.jpg',
    url: '',
    websiteUrl: 'https://acme.example',
    reviewUrl: 'https://reviews.example/secret',
    categories: ['Plumbing'],
    cities: ['marietta'],
    category: 'plumbing',
    isTrial: true,
    trialEndsAt: '2099-01-01T00:00:00.000Z',
    proSiteEnabled: true,
    contactEmail: 'owner@acme.example',
    dashboardToken: 'secret-dash-token',
    photos: ['https://example.test/2.jpg'],
  }
}

describe('toPublicBusiness', () => {
  it('drops private fields and keeps what public pages render', () => {
    const result = toPublicBusiness(business())

    expect(result).toMatchObject({
      id: 'biz-1',
      source: 'manual',
      yelpId: 'yelp-1',
      name: 'Acme Plumbing',
      phone: '555-0100',
      websiteUrl: 'https://acme.example',
      reviewUrl: 'https://reviews.example/secret',
      proSiteEnabled: true,
      cities: ['marietta'],
      category: 'plumbing',
    })
    expect(result.reviewUrl).toBe('https://reviews.example/secret')
    expect(result).not.toHaveProperty('dashboardToken')
    expect(result).not.toHaveProperty('contactEmail')
    expect(result).not.toHaveProperty('isTrial')
    expect(result).not.toHaveProperty('trialEndsAt')
    expect(JSON.stringify(result)).not.toContain('secret-dash-token')
    expect(JSON.stringify(result)).not.toContain('owner@acme.example')
  })
})
