import { describe, expect, it, beforeEach, vi } from 'vitest'

// Regression test for QPL-003 ("addCuratedFromYelp only stored cities[0]"):
// this exercises the actual trial-enrollment call site in this route file
// (rather than calling lib/kv.ts's addCuratedFromYelp directly, which
// lib/kv.test.ts already covers) so a future regression here — e.g.
// reverting to `invitation.cities[0]` or `cities[0]` at this call site —
// would be caught.

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ email: 'admin@test.com', userId: 'admin-1' }),
  AuthError: class AuthError extends Error {
    status: 401 | 403
    constructor(status: 401 | 403, message: string) {
      super(message)
      this.status = status
    }
  },
}))

const { supabaseSingleMock } = vi.hoisted(() => ({
  supabaseSingleMock: vi.fn().mockResolvedValue({ data: { id: 'curated-1' } }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: supabaseSingleMock }) }),
    }),
  }),
}))

vi.mock('@/lib/kv', async () => import('@/lib/kv.test-double'))

// Note: intentionally NOT using lib/invitations.test-double.ts here (unlike
// lib/invitations.test.ts) — that double re-exports `isInvitationExpired`
// from the real `./invitations` module, and combining that re-export with
// this route's full import graph (lib/kv + lib/auth + next/server together)
// reproduces the module-resolution hang tracked by #22/#29. A plain
// vi.fn()-based mock avoids it while still letting us assert on the call.
const { createTrialInvitationMock } = vi.hoisted(() => ({
  createTrialInvitationMock: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/invitations', () => ({
  createInvitation: vi.fn(),
  createTrialInvitation: createTrialInvitationMock,
  listInvitations: vi.fn(),
  deleteInvitation: vi.fn(),
}))

import { POST } from './route'
import { __reset as resetCurated, __all as allCurated } from '@/lib/kv.test-double'

function makeRequest(body: unknown): Request {
  return new Request('https://example.test/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/invitations (trial path, multi-city)', () => {
  beforeEach(() => {
    resetCurated()
    createTrialInvitationMock.mockClear()
    supabaseSingleMock.mockClear()
    process.env.SUPABASE_URL = 'https://example.test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('stores every submitted city on the curated business, not just the first', async () => {
    const res = await POST(
      makeRequest({
        businessName: 'Acme Plumbing',
        category: 'plumbing',
        cities: ['Austin, TX', 'Dallas, TX', 'Houston, TX'],
        isTrial: true,
        trialDays: 14,
        yelpId: 'yelp-1',
        yelpData: {
          rating: 4.5,
          reviewCount: 20,
          phone: '555-1234',
          address: '123 Main St',
          imageUrl: 'https://example.test/photo.jpg',
          url: 'https://www.yelp.com/biz/yelp-1',
          categories: ['Plumbing'],
        },
      }) as never
    )

    expect(res.status).toBe(200)

    const curated = allCurated()
    expect(curated).toHaveLength(1)
    expect(curated[0].cities).toEqual(['austin', 'dallas', 'houston'])

    expect(createTrialInvitationMock).toHaveBeenCalledTimes(1)
    expect(createTrialInvitationMock.mock.calls[0][0].cities).toEqual([
      'austin',
      'dallas',
      'houston',
    ])
  })
})
