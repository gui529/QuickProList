import { beforeEach, describe, expect, it, vi } from 'vitest'

const create = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<{ url: string }>>(async () => ({ url: 'https://checkout.test/session' }))
)

vi.mock('stripe', () => ({
  default: class Stripe {
    checkout = { sessions: { create } }
  },
}))

import { createCheckoutSession } from './stripe'

describe('createCheckoutSession product name', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_example'
    create.mockClear()
  })

  it('names the Stripe product QuickProList Listing - {businessName}', async () => {
    await createCheckoutSession('11111111-1111-4111-8111-111111111111', 'Acme Plumbing', 29.99, 'https://example.test/enroll')
    const session = create.mock.calls[0][0] as {
      line_items: Array<{ price_data: { product_data: { name: string } } }>
    }
    expect(session.line_items[0].price_data.product_data.name).toBe('QuickProList Listing - Acme Plumbing')
    expect(JSON.stringify(session)).not.toMatch(/featured/i)
  })
})