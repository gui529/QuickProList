// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import BusinessCard from './BusinessCard'
import { monogramColor } from './contactList'
import type { Business } from '@/lib/yelp'

function makeBusiness(overrides: Partial<Business> & { id: string }): Business {
  return {
    source: 'yelp',
    name: `Business ${overrides.id}`,
    rating: 4.5,
    reviewCount: 10,
    phone: '555-0100',
    address: '123 Main St',
    imageUrl: '',
    url: '',
    websiteUrl: 'example.com',
    categories: [],
    ...overrides,
  }
}

describe('BusinessCard contact-click tracking in search results', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('posts to the click-tracking endpoint when a curated business phone link is clicked, even without ProSite enabled', () => {
    const business = makeBusiness({
      id: '11111111-1111-1111-1111-111111111111',
      source: 'manual',
      proSiteEnabled: false,
    })

    render(<BusinessCard business={business} />)

    fireEvent.click(screen.getByRole('link', { name: 'Call 555-0100' }))

    expect(fetch).toHaveBeenCalledWith(
      '/api/pro/11111111-1111-1111-1111-111111111111/click',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'phone' }),
      })
    )
  })

  it('paints a stable color behind the initials when there is no photo', () => {
    const business = makeBusiness({ id: 'yelp-business-1', source: 'yelp', name: 'Marcus Hale' })
    render(<BusinessCard business={business} />)
    const initials = screen.getByText('MH')
    const probe = document.createElement('span')
    probe.style.backgroundColor = monogramColor('Marcus Hale')
    expect(initials.style.backgroundColor).toBe(probe.style.backgroundColor)
    expect(initials.className).toContain('text-white')
  })

  it('does not track clicks for plain (non-curated) Yelp search results', () => {
    const business = makeBusiness({ id: 'yelp-business-1', source: 'yelp' })

    render(<BusinessCard business={business} />)

    fireEvent.click(screen.getByRole('link', { name: 'Call 555-0100' }))

    expect(fetch).not.toHaveBeenCalled()
  })
})
