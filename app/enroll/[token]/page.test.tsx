import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'

// Only stub out `getInvitationByToken` (so the test doesn't need live
// Supabase credentials) — keep the real `isInvitationExpired` so this test
// exercises the page's actual expiration enforcement, not a mock of it.
const { getInvitationByTokenMock } = vi.hoisted(() => ({ getInvitationByTokenMock: vi.fn() }))
vi.mock('@/lib/invitations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/invitations')>()
  return { ...actual, getInvitationByToken: getInvitationByTokenMock }
})

import EnrollPage from './page'
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
    status: 'pending',
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    canceled_at: null,
    trial_ends_at: null,
    ...overrides,
  }
}

/** Flattens a React element tree's text content for simple assertions. */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  const el = node as ReactElement<{ children?: ReactNode }>
  if (el.props?.children !== undefined) return textOf(el.props.children)
  return ''
}

describe('EnrollPage (expiration enforcement)', () => {
  beforeEach(() => {
    getInvitationByTokenMock.mockReset()
  })

  it('shows the expired state for a pending invitation whose expires_at has passed', async () => {
    const invitation = makeInvitation({ expires_at: new Date(Date.now() - 1000).toISOString() })
    getInvitationByTokenMock.mockResolvedValue(invitation)

    const result = await EnrollPage({ params: Promise.resolve({ token: invitation.token }) })

    expect(textOf(result)).toContain('Link expired')
  })

  it('renders the enrollment flow for a pending invitation still within its window', async () => {
    const invitation = makeInvitation({ expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString() })
    getInvitationByTokenMock.mockResolvedValue(invitation)

    const result = await EnrollPage({ params: Promise.resolve({ token: invitation.token }) })

    expect(textOf(result)).not.toContain('Link expired')
  })
})
