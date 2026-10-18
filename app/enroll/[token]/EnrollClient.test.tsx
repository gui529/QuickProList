// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import EnrollClient from './EnrollClient'
import type { EnrollmentInvitation } from '@/lib/invitations'
import {
  formatSubscriptionPrice,
  SUBSCRIPTION_PRICE_MISMATCH_ERROR,
  subscriptionDisclosureText,
  subscriptionSuccessLine,
} from '@/lib/subscription-terms'

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
    render(
      <EnrollClient
        invitation={makeInvitation()}
        token="test-token"
        dashboardToken="dash-token-123"
        proDashboardEnabled
        checkoutSuccess
      />
    )

    const link = screen.getByRole('link', { name: /view your dashboard/i })
    expect(link.getAttribute('href')).toBe('/dashboard/dash-token-123')
  })

  it('opens checkout on the first render when the server says subscribe=1', () => {
    render(
      <EnrollClient
        invitation={makeInvitation({ status: 'pending', curated_business_id: null })}
        token="test-token"
        subscribe
      />
    )

    expect(screen.getByRole('heading', { name: /subscribe to stay listed/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /go to secure checkout/i })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /your listing preview/i })).toBeNull()
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
    render(
      <EnrollClient
        invitation={makeInvitation()}
        token="test-token"
        dashboardToken={null}
        checkoutSuccess
      />
    )

    expect(screen.queryByRole('link', { name: /view your dashboard/i })).toBeNull()
    expect(screen.getByText('Payment successful!')).toBeTruthy()
  })

  it('states that the listing is live and the subscription renews monthly at the configured price', () => {
    render(
      <EnrollClient
        invitation={makeInvitation({ monthly_price: 49, cities: ['austin', 'marietta'] })}
        token="test-token"
        dashboardToken={null}
        checkoutSuccess
      />
    )

    const line = subscriptionSuccessLine('Acme Plumbing', 'Plumbers', 'Austin, Marietta')
    expect(line).toBe(
      `Acme Plumbing is now listed on QuickProList for Plumbers in Austin, Marietta. Your ${formatSubscriptionPrice()}/month subscription renews monthly until you cancel.`
    )
    expect(screen.getByText(line)).toBeTruthy()
    expect(screen.queryByText(/\$49/)).toBeNull()
    expect(screen.queryByText(/will see your business first/i)).toBeNull()
    expect(screen.queryByText(/featured/i)).toBeNull()
    expect(screen.queryByText(/now active/i)).toBeNull()
  })

  it('shows the disclosure beside checkout and blocks payment until the box is checked', () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <EnrollClient
        invitation={makeInvitation({ status: 'pending', curated_business_id: null })}
        token="test-token"
        initialContactEmail="owner@acme.example"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /subscribe now/i }))

    expect(screen.getByText(subscriptionDisclosureText())).toBeTruthy()
    const checkbox = screen.getByRole('checkbox', { name: /i agree to these subscription terms/i }) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
    const checkout = screen.getByRole('button', { name: /go to secure checkout/i }) as HTMLButtonElement
    expect(checkout.disabled).toBe(true)

    fireEvent.click(checkout)
    expect(fetchMock).not.toHaveBeenCalled()

    const cancel = screen.getByRole('link', { name: /email to cancel/i })
    const href = cancel.getAttribute('href') ?? ''
    expect(href.startsWith('mailto:contact@quickprolist.com?subject=Cancel%20QuickProList%20subscription&body=')).toBe(true)
    expect(decodeURIComponent(href)).toContain('Acme Plumbing')
    expect(decodeURIComponent(href)).toContain('owner@acme.example')

    fireEvent.click(checkbox)
    fireEvent.click(checkout)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/stripe/checkout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'test-token', consent: true }),
      })
    )

    vi.unstubAllGlobals()
  })

  it('describes the preview as how the listing can look, without promising a better spot', () => {
    render(
      <EnrollClient
        invitation={makeInvitation({ status: 'pending', curated_business_id: null })}
        token="test-token"
      />
    )

    expect(screen.getByText(/this is how your listing can look on QuickProList/i)).toBeTruthy()
    expect(screen.getByText(/this is how your listing can look in austin/i)).toBeTruthy()
    expect(screen.queryByText(/pinned/i)).toBeNull()
    expect(screen.queryByText(/featured/i)).toBeNull()
    expect(screen.queryByText(/\bfirst\b/i)).toBeNull()
  })

  it('uses the trial length passed from the server', () => {
    render(
      <EnrollClient
        invitation={makeInvitation({ status: 'pending', curated_business_id: null })}
        token="test-token"
        previewTrialDays={14}
      />
    )

    expect(screen.getByRole('button', { name: /start my 14-day preview/i })).toBeTruthy()
    expect(screen.getByText(/live in search for 14 days/i)).toBeTruthy()
    expect(screen.queryByText(/30-day/)).toBeNull()
    expect(screen.queryByText(/for 30 days/)).toBeNull()
  })

  it('disables subscribe and checkout when the invitation price is missing or not 29.99', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(
      <EnrollClient
        invitation={makeInvitation({
          status: 'pending',
          curated_business_id: null,
          monthly_price: 49,
        })}
        token="test-token"
      />
    )

    const subscribe = screen.getByRole('button', { name: /subscribe now/i }) as HTMLButtonElement
    expect(subscribe.disabled).toBe(true)
    expect(subscribe.textContent).toContain(`${formatSubscriptionPrice()}/mo`)
    expect(screen.getByText(SUBSCRIPTION_PRICE_MISMATCH_ERROR)).toBeTruthy()
    expect(screen.queryByText(/\$49/)).toBeNull()
    fireEvent.click(subscribe)
    expect(screen.queryByRole('button', { name: /secure checkout/i })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()

    cleanup()

    render(
      <EnrollClient
        invitation={makeInvitation({
          status: 'pending',
          curated_business_id: 'curated-1',
          monthly_price: null as unknown as number,
        })}
        token="test-token"
      />
    )

    expect(screen.getByText(formatSubscriptionPrice())).toBeTruthy()
    expect(screen.getByText(subscriptionDisclosureText())).toBeTruthy()
    expect(screen.getByText(SUBSCRIPTION_PRICE_MISMATCH_ERROR)).toBeTruthy()
    const checkout = screen.getByRole('button', { name: /go to secure checkout/i }) as HTMLButtonElement
    expect(checkout.disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: /i agree to these subscription terms/i }))
    fireEvent.click(checkout)
    expect(fetchMock).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
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
