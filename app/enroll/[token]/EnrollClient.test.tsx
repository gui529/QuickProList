// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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
      <EnrollClient
        invitation={makeInvitation()}
        token="test-token"
        dashboardToken="dash-token-123"
        proDashboardEnabled
      />
    )

    const link = screen.getByRole('link', { name: /view your dashboard/i })
    expect(link.getAttribute('href')).toBe('/dashboard/dash-token-123')
  })

  it('shows listing preview first for pending invitations (no checkout button yet)', () => {
    render(
      <EnrollClient
        invitation={makeInvitation({ status: 'pending', curated_business_id: null })}
        token="test-token"
        dashboardToken={null}
      />
    )

    expect(screen.getByRole('heading', { name: /your listing preview/i })).toBeTruthy()
    expect(screen.getByText('Acme Plumbing')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /secure checkout/i })).toBeNull()
    expect(screen.getByRole('button', { name: /start my 30-day preview/i })).toBeTruthy()
  })

  it('omits the dashboard link when no dashboard token is available yet', () => {
    window.history.pushState({}, '', '/enroll/test-token?success=1')

    render(
      <EnrollClient invitation={makeInvitation()} token="test-token" dashboardToken={null} />
    )

    expect(screen.queryByRole('link', { name: /view your dashboard/i })).toBeNull()
    expect(screen.getByText('Payment successful!')).toBeTruthy()
  })

  it('does not promise top placement after payment', () => {
    window.history.pushState({}, '', '/enroll/test-token?success=1')

    render(<EnrollClient invitation={makeInvitation()} token="test-token" dashboardToken={null} />)

    expect(screen.getByText('Your listing is live on QuickProList.')).toBeTruthy()
    expect(screen.queryByText(/will see your business first/i)).toBeNull()
    expect(screen.queryByText(/featured/i)).toBeNull()
  })

  it('links current results to homepage search for that trade and city', () => {
    render(
      <EnrollClient
        invitation={makeInvitation({ status: 'pending', curated_business_id: null, cities: ['marietta'] })}
        token="test-token"
      />
    )

    const link = screen.getByRole('link', { name: /see current plumbers results in marietta/i })
    expect(link.getAttribute('href')).toBe('/?location=marietta&category=plumbing')
  })

  it('prefills the reminder email and requires it before starting a preview', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(
      <EnrollClient
        invitation={makeInvitation({ status: 'pending', curated_business_id: null })}
        token="test-token"
        initialContactEmail="owner@acme.example"
      />
    )

    const input = screen.getByLabelText(/email for preview reminders/i) as HTMLInputElement
    expect(input.value).toBe('owner@acme.example')
    expect(input.required).toBe(true)

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /start my 30-day preview/i }))
    expect(screen.getByText('Enter an email for preview reminders.')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: /start my 30-day preview/i }))
    expect(screen.getByText('Enter a valid email for preview reminders.')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
