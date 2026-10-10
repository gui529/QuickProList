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
import { OPEN_TOWNS } from '@/lib/open-towns'

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
    expect(document.body.textContent).not.toMatch(/yelp/i)
    expect(document.body.textContent).not.toMatch(/4\.5/)
    expect(document.body.textContent).not.toMatch(/12 reviews/)
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
    expect(offered).toEqual(OPEN_TOWNS.map((t) => t.name))
    expect(offered).toEqual(expect.arrayContaining(['Smyrna', 'Canton', 'Fair Oaks', 'Alpharetta', 'Atlanta']))

    fireEvent.change(screen.getByRole('textbox', { name: 'Town' }), { target: { value: 'Zzz' } })
    expect(screen.queryByRole('list', { name: /towns/i })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('searches when Atlanta is in the URL', async () => {
    searchParams = new URLSearchParams({ category: 'plumbing', location: 'Atlanta, GA' })
    render(<HomePage />)

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByText(/not open there yet/i)).toBeNull()
  })

  it('does not search from a typed town outside the area', () => {
    render(<HomePage />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Town' }), { target: { value: 'Austin' } })
    fireEvent.click(screen.getByRole('button', { name: /plumbers/i }))

    expect(screen.getByText(/not open there yet/i)).toBeDefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows a friendly empty state when a search finds no pros', async () => {
    searchParams = new URLSearchParams({ category: 'homecleaning', location: 'Marietta, GA' })
    render(<HomePage />)

    await waitFor(() => expect(screen.getByText('No pros found here yet. Check back soon.')).toBeDefined())
    expect(screen.queryByText(/something went wrong/i)).toBeNull()
  })

  it.each(['Woodstock', 'Smyrna', 'Canton', 'Fair Oaks'])(
    'searches from the typed opened town %s',
    async (town) => {
      render(<HomePage />)
      fireEvent.change(screen.getByRole('textbox', { name: 'Town' }), { target: { value: town } })
      fireEvent.click(screen.getByRole('button', { name: /plumbers/i }))

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
      const url = String((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])
      expect(new URL(url, 'http://localhost').searchParams.get('location')).toBe(town)
    }
  )
})
