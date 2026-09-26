// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import ReportsTab from './ReportsTab'
import type { EnrollmentInvitation } from '@/lib/invitations'
import type { BusinessReport } from '@/lib/reports'

function makeInvitation(overrides: Partial<EnrollmentInvitation> = {}): EnrollmentInvitation {
  return {
    id: 'inv-1',
    token: 'tok-1',
    business_name: 'Acme Plumbing',
    yelp_id: null,
    yelp_data: null,
    category: 'plumbing',
    cities: ['austin'],
    monthly_price: 29.99,
    status: 'pending',
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    canceled_at: null,
    trial_ends_at: null,
    ...overrides,
  }
}

function makeReport(overrides: Partial<BusinessReport> = {}): BusinessReport {
  return {
    id: 'biz-1',
    name: 'Acme Plumbing',
    source: 'manual',
    category: 'plumbing',
    cities: ['austin'],
    pinned_at: new Date().toISOString(),
    is_trial: false,
    trial_ends_at: null,
    pro_site_enabled: false,
    current_status: 'pending',
    actions_count: 3,
    invitations: [
      makeInvitation({ id: 'expired-status', status: 'expired' }),
      makeInvitation({
        id: 'pending-but-expired',
        status: 'pending',
        expires_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      }),
      makeInvitation({ id: 'still-pending', status: 'pending' }),
    ],
    ...overrides,
  }
}

describe('ReportsTab invitation timeline badges', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the same slate "expired" badge for status: expired and a pending-but-past-expires_at invitation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.startsWith('/api/reports')) {
          return Promise.resolve({ ok: true, json: async () => ({ reports: [makeReport()] }) } as Response)
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      })
    )

    render(<ReportsTab />)

    await waitFor(() => {
      expect(screen.getByText('Acme Plumbing')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('Acme Plumbing'))

    await waitFor(() => {
      expect(screen.getAllByText('expired')).toHaveLength(2)
    })

    for (const badge of screen.getAllByText('expired')) {
      expect(badge.className).toContain('bg-slate-100')
      expect(badge.className).toContain('text-slate-500')
    }

    const pendingBadge = screen.getByText('pending')
    expect(pendingBadge.className).toContain('bg-amber-50')
  })
})
