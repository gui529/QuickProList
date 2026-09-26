import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'

// Only stub out `getCuratedByDashboardToken`/`listInvitations` (so the test
// doesn't need live Supabase credentials) — keep the real `deriveStatus` so
// this test exercises the page's actual status-deriving logic, not a mock
// of it.
const { getCuratedByDashboardTokenMock, listInvitationsMock } = vi.hoisted(() => ({
  getCuratedByDashboardTokenMock: vi.fn(),
  listInvitationsMock: vi.fn(),
}))
vi.mock('@/lib/kv', () => ({ getCuratedByDashboardToken: getCuratedByDashboardTokenMock }))
vi.mock('@/lib/invitations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/invitations')>()
  return { ...actual, listInvitations: listInvitationsMock }
})

import DashboardPage from './page'
import type { BusinessDashboardData } from '@/lib/kv'
import type { EnrollmentInvitation } from '@/lib/invitations'

function makeBusiness(overrides: Partial<BusinessDashboardData> = {}): BusinessDashboardData {
  return {
    id: 'curated-1',
    name: 'Acme Plumbing',
    source: 'yelp',
    isTrial: false,
    trialEndsAt: null,
    profileViews: 42,
    phoneClicks: 7,
    websiteClicks: 3,
    directionsClicks: 1,
    ...overrides,
  }
}

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
    status: 'pending',
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: 'curated-1',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    canceled_at: null,
    trial_ends_at: null,
    ...overrides,
  }
}

/**
 * Flattens a React element tree's text content for simple assertions.
 * Also invokes plain function components (e.g. this page's local `StatCard`)
 * so their rendered output — not just their raw props — is included, since
 * this walks the element tree directly rather than through a renderer.
 */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  const el = node as ReactElement<{ children?: ReactNode }>
  if (typeof el.type === 'function') {
    return textOf((el.type as (props: unknown) => ReactNode)(el.props))
  }
  if (el.props?.children !== undefined) return textOf(el.props.children)
  return ''
}

describe('BusinessDashboardPage', () => {
  beforeEach(() => {
    getCuratedByDashboardTokenMock.mockReset()
    listInvitationsMock.mockReset()
    listInvitationsMock.mockResolvedValue([])
  })

  it('404s for an invalid or missing token', async () => {
    getCuratedByDashboardTokenMock.mockResolvedValue(null)

    await expect(
      DashboardPage({ params: Promise.resolve({ token: 'bogus-token' }) })
    ).rejects.toMatchObject({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })
  })

  it('renders the business stats and a paid status for a valid token', async () => {
    getCuratedByDashboardTokenMock.mockResolvedValue(makeBusiness())
    listInvitationsMock.mockResolvedValue([
      makeInvitation({ status: 'paid', curated_business_id: 'curated-1' }),
    ])

    const result = await DashboardPage({ params: Promise.resolve({ token: 'good-token' }) })
    const text = textOf(result)

    expect(text).toContain('Acme Plumbing')
    expect(text).toContain('Active subscription')
    expect(text).toContain('42')
    expect(text).toContain('7')
    expect(text).toContain('3')
    expect(text).toContain('1')
  })

  it('does not count invitations belonging to a different business', async () => {
    getCuratedByDashboardTokenMock.mockResolvedValue(makeBusiness({ isTrial: false, trialEndsAt: null }))
    listInvitationsMock.mockResolvedValue([
      makeInvitation({ status: 'paid', curated_business_id: 'some-other-business' }),
    ])

    const result = await DashboardPage({ params: Promise.resolve({ token: 'good-token' }) })
    const text = textOf(result)

    expect(text).toContain('Inactive')
    expect(text).not.toContain('Active subscription')
  })

  it('shows a trial status for a business still within its trial window', async () => {
    getCuratedByDashboardTokenMock.mockResolvedValue(
      makeBusiness({
        isTrial: true,
        trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      })
    )

    const result = await DashboardPage({ params: Promise.resolve({ token: 'good-token' }) })

    expect(textOf(result)).toContain('Trial')
  })
})
