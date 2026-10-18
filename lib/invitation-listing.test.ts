import { describe, expect, it } from 'vitest'
import { listingFieldsFromInvitation } from './invitation-listing'
import type { EnrollmentInvitation } from './invitations'

function invitation(yelpData: Record<string, unknown> | null): EnrollmentInvitation {
  return {
    id: 'inv-1',
    token: '22222222-2222-4222-8222-222222222222',
    business_name: 'Acme Plumbing',
    yelp_id: null,
    yelp_data: yelpData,
    category: 'plumbing',
    cities: ['marietta'],
    monthly_price: 29.99,
    status: 'pending',
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    expires_at: '2099-01-01T00:00:00.000Z',
    canceled_at: null,
    trial_ends_at: null,
  }
}

describe('listingFieldsFromInvitation', () => {
  it('reads phone and the other stored business details', () => {
    expect(
      listingFieldsFromInvitation(
        invitation({
          phone: ' 770-555-0142 ',
          address: '10 Main St',
          websiteUrl: 'https://acme.example',
          imageUrl: 'https://acme.example/logo.png',
        })
      )
    ).toEqual({
      phone: '770-555-0142',
      address: '10 Main St',
      websiteUrl: 'https://acme.example',
      imageUrl: 'https://acme.example/logo.png',
    })
  })

  it('returns null phone when the source record has none', () => {
    expect(listingFieldsFromInvitation(invitation({ phone: '  ' })).phone).toBeNull()
    expect(listingFieldsFromInvitation(invitation(null)).phone).toBeNull()
  })
})
