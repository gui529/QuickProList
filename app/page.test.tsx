// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'

let searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}))

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}))

import HomePage from './page'

const BANNED = [/trusted/i, /verified/i, /vetted/i, /hand-?picked/i, /top-?rated/i]

function expectNoBannedClaims() {
  const text = document.body.textContent ?? ''
  for (const pattern of BANNED) {
    expect(text).not.toMatch(pattern)
  }
}

describe('HomePage copy', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams()
    localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          businesses: [
            {
              id: 'y1',
              source: 'yelp',
              name: 'Acme Plumbing',
              rating: 4.5,
              reviewCount: 12,
              phone: '555-0100',
              address: '1 Main St',
              imageUrl: '',
              url: '',
              categories: [],
            },
            {
              id: 'm1',
              source: 'manual',
              name: 'Manual Plumbing',
              rating: null,
              reviewCount: null,
              phone: '555-0101',
              address: '2 Main St',
              imageUrl: '',
              url: '',
              categories: [],
            },
          ],
        }),
      })
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('does not make trust, vetting, or ranking claims in the empty state', () => {
    render(<HomePage />)

    expect(screen.getByText(/find pros in your city/i)).toBeDefined()
    expectNoBannedClaims()
  })

  it('does not make trust, vetting, or ranking claims once results render', async () => {
    searchParams = new URLSearchParams({ category: 'plumbing', location: 'Acworth' })
    render(<HomePage />)

    await waitFor(() => expect(screen.getByText('Acme Plumbing')).toBeDefined())

    expect(screen.getByRole('heading', { name: '2 Plumbers in Acworth' })).toBeDefined()
    expect(document.body.textContent).not.toMatch(/\btop\b/i)
    expect(screen.getByText(/12 Yelp reviews/)).toBeDefined()
    expectNoBannedClaims()
  })
})
