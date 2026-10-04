// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react'

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

    expect(screen.getByRole('heading', { name: 'QuickProList' })).toBeDefined()
    expect(screen.queryByText(/the right hand/i)).toBeNull()
    expect(screen.queryByText(/find local pros/i)).toBeNull()
    expectNoBannedClaims()
  })

  it('does not make trust, vetting, or ranking claims once results render', async () => {
    searchParams = new URLSearchParams({ category: 'plumbing', location: 'Acworth' })
    render(<HomePage />)

    await waitFor(() => expect(screen.getByText('Acme Plumbing')).toBeDefined())

    expect(screen.getByRole('heading', { name: 'Plumbers' })).toBeDefined()
    expect(screen.getByText('Acworth')).toBeDefined()
    expect(document.body.textContent).not.toMatch(/\btop\b/i)
    expect(screen.getByText('Plumber · 4.5 (12)')).toBeDefined()
    expect(screen.queryByText(/featured/i)).toBeNull()
    expectNoBannedClaims()
  })
})

describe('HomePage open area', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams()
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ businesses: [] }) }))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('offers only the opened towns and never calls a worldwide city lookup', () => {
    render(<HomePage />)
    fireEvent.focus(screen.getByRole('textbox', { name: 'Town' }))

    const offered = within(screen.getByRole('list', { name: /towns/i }))
      .getAllByRole('button')
      .map((b) => b.textContent)
    expect(offered).toEqual(['Acworth', 'Kennesaw', 'Marietta', 'Woodstock'])
    for (const closed of ['Smyrna', 'Canton', 'Atlanta']) {
      expect(document.body.textContent).not.toContain(closed)
    }

    fireEvent.change(screen.getByRole('textbox', { name: 'Town' }), { target: { value: 'Atl' } })
    expect(screen.queryByRole('list', { name: /towns/i })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each(['Smyrna', 'Atlanta, GA'])('shows "not open there yet" for %s and does not search', async (town) => {
    searchParams = new URLSearchParams({ category: 'plumbing', location: town })
    render(<HomePage />)

    await waitFor(() => expect(screen.getByText(/not open there yet/i)).toBeDefined())
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.queryByText(/Plumbers in/)).toBeNull()
  })

  it('asks for a town when a trade is tapped with the city empty', () => {
    render(<HomePage />)
    fireEvent.click(screen.getByRole('button', { name: /plumbers/i }))

    expect(screen.getByText(/choose your town first/i)).toBeDefined()
    expect(screen.getByRole('heading', { name: 'QuickProList' })).toBeDefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not search from a typed town outside the area', () => {
    render(<HomePage />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Town' }), { target: { value: 'Smyrna' } })
    fireEvent.click(screen.getByRole('button', { name: /plumbers/i }))

    expect(screen.getByText(/not open there yet/i)).toBeDefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('searches from a typed opened town', async () => {
    render(<HomePage />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Town' }), { target: { value: 'Woodstock' } })
    fireEvent.click(screen.getByRole('button', { name: /plumbers/i }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(String((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain('location=Woodstock')
  })
})
