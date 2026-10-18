import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  isDatabaseConfigured: () => Boolean(process.env.DATABASE_URL),
  query: (...args: unknown[]) => queryMock(...args),
}))

import EnrollPage from './page'
import EnrollNotFound from './not-found'
import type { EnrollmentInvitation } from '@/lib/invitations'

const KNOWN_TOKEN = '22222222-2222-4222-8222-222222222222'
const UNKNOWN_TOKEN = '11111111-1111-4111-8111-111111111111'

function invitationRow(token: string) {
  return {
    id: '6b1b3c2e-8f4a-4c1d-9a2b-111111111111',
    token,
    business_name: 'Acme Plumbing',
    yelp_id: null,
    yelp_data: null,
    category: 'plumbing',
    cities: ['austin'],
    monthly_price: 29.99,
    status: 'pending' as const,
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    expires_at: '2099-01-01T00:00:00.000Z',
    canceled_at: null,
    trial_ends_at: null,
    contact_email: 'owner@acme.example',
  }
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  const el = node as ReactElement<{ children?: ReactNode; href?: string }>
  const href = el.props?.href ? ` ${el.props.href}` : ''
  if (el.props?.children !== undefined) return `${href} ${textOf(el.props.children)}`
  return href
}

describe('EnrollPage token lookup', () => {
  beforeEach(() => {
    queryMock.mockReset()
    process.env.DATABASE_URL = 'postgres://test'
    delete process.env.PRO_DASHBOARD_ENABLED
  })

  it('keeps the invalid-link explanation on the 404 page', () => {
    const text = textOf(EnrollNotFound())
    expect(text).toContain('Link not found')
    expect(text).toContain('This enrollment link is invalid or has expired')
    expect(text).toContain('Back to home')
    expect(text).toContain('Contact us')
  })

  it.each(['abc', '123', 'invalid-token-xyz'])(
    'returns 404 for non-UUID token %s without querying',
    async (token) => {
      queryMock.mockRejectedValue(Object.assign(new Error('invalid input syntax for type uuid'), { code: '22P02' }))

      await expect(EnrollPage({ params: Promise.resolve({ token }) })).rejects.toMatchObject({
        digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
      })
      expect(queryMock).not.toHaveBeenCalled()
    }
  )

  it('returns 404 for an unknown UUID', async () => {
    queryMock.mockResolvedValue([])

    await expect(EnrollPage({ params: Promise.resolve({ token: UNKNOWN_TOKEN }) })).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(queryMock).toHaveBeenCalledTimes(1)
  })

  it('renders the enrollment flow for a valid token that exists', async () => {
    queryMock.mockResolvedValue([invitationRow(KNOWN_TOKEN)])

    const result = await EnrollPage({ params: Promise.resolve({ token: KNOWN_TOKEN }) })
    const props = (result as ReactElement<{ invitation: EnrollmentInvitation; token: string }>).props

    expect(textOf(result)).not.toContain('Link not found')
    expect(props.token).toBe(KNOWN_TOKEN)
    expect(props.invitation.business_name).toBe('Acme Plumbing')
    expect(props.invitation.status).toBe('pending')
  })
})
