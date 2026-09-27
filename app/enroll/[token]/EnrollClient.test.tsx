// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import EnrollClient from './EnrollClient'
import type { EnrollmentInvitation } from '@/lib/invitations'

function makeInvitation(overrides: Partial<EnrollmentInvitation> = {}): EnrollmentInvitation {
  return {
    id: 'invitation-1',
    token: 'test-token',
    business_name: 'Acme Plumbing',
    yelp_id: null,
    yelp_data: null,
    category: 'plumbing',
    cities: ['austin'],
    monthly_price: 29.99,
    status: 'paid',
    stripe_session_id: 'sess_1',
    stripe_subscription_id: 'sub_1',
    curated_business_id: 'curated-1',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    canceled_at: null,
    trial_ends_at: null,
    ...overrides,
  }
}

describe('EnrollClient (success view dashboard link)', () => {
  afterEach(() => {
    cleanup()
    window.history.pushState({}, '', '/')
  })

  it('renders a link to the dashboard when a dashboard token is available', () => {
    window.history.pushState({}, '', '/enroll/test-token?success=1')

    render(
      <EnrollClient invitation={makeInvitation()} token="test-token" dashboardToken="dash-token-123" />
    )

    const link = screen.getByRole('link', { name: /view your dashboard/i })
    expect(link.getAttribute('href')).toBe('/dashboard/dash-token-123')
  })

  it('omits the dashboard link when no dashboard token is available yet', () => {
    window.history.pushState({}, '', '/enroll/test-token?success=1')

    render(
      <EnrollClient invitation={makeInvitation()} token="test-token" dashboardToken={null} />
    )

    expect(screen.queryByRole('link', { name: /view your dashboard/i })).toBeNull()
    expect(screen.getByText('Payment successful!')).toBeTruthy()
  })
})
