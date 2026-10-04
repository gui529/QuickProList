// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import AdminClient from './AdminClient'
import type { EnrollmentInvitation } from '@/lib/invitations'
import type { Business } from '@/lib/yelp'

vi.mock('next/image', () => ({
  default: () => null,
}))

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

describe('AdminClient invitations tab badges', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.startsWith('/api/curated')) {
          return Promise.resolve({ ok: true, json: async () => ({ businesses: [] }) } as Response)
        }
        if (url.startsWith('/api/invitations')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              invitations: [
                makeInvitation({ id: 'expired-status', status: 'expired' }),
                makeInvitation({
                  id: 'pending-but-expired',
                  status: 'pending',
                  expires_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                }),
                makeInvitation({ id: 'still-pending', status: 'pending' }),
              ],
            }),
          } as Response)
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      })
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the same slate "expired" badge for status: expired and a pending-but-past-expires_at invitation', async () => {
    render(<AdminClient adminEmail="admin@example.com" />)

    fireEvent.click(screen.getByRole('button', { name: 'Invitations' }))

    await waitFor(() => {
      expect(screen.getAllByText('expired')).toHaveLength(2)
    })

    for (const badge of screen.getAllByText('expired')) {
      expect(badge.className).toContain('bg-slate-100')
      expect(badge.className).toContain('text-slate-600')
    }

    // The one invitation that's genuinely still pending keeps the amber badge.
    const pendingBadge = screen.getByText('pending')
    expect(pendingBadge.className).toContain('bg-amber-50')
  })
})

function makeBusiness(overrides: Partial<Business> & { id: string; name: string }): Business {
  return {
    source: 'manual',
    rating: null,
    reviewCount: null,
    phone: '',
    address: '',
    imageUrl: '',
    url: '',
    categories: [],
    ...overrides,
  }
}

describe('AdminClient profile completeness', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows each pinned business\'s profile score so under-activated listings stand out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.startsWith('/api/curated')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              businesses: [
                makeBusiness({ id: 'empty', name: 'Empty Pro' }),
                makeBusiness({
                  id: 'full',
                  name: 'Full Pro',
                  imageUrl: 'https://example.test/photo.jpg',
                  websiteUrl: 'https://full.example',
                  contactEmail: 'owner@full.example',
                  reviewUrl: 'https://g.page/r/full/review',
                  proSiteEnabled: true,
                }),
              ],
            }),
          } as Response)
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      })
    )

    render(<AdminClient adminEmail="admin@example.com" />)

    const emptyScore = await screen.findByText('Profile 0%')
    const fullScore = await screen.findByText('Profile 100%')

    expect(emptyScore.className).toContain('bg-rose-50')
    expect(emptyScore.getAttribute('title')).toContain('Website')
    expect(emptyScore.getAttribute('title')).toContain('Photo')
    expect(fullScore.className).toContain('bg-emerald-50')
    expect(fullScore.getAttribute('title')).toBe('Profile complete')
  })
})
