// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import BusinessCard from './BusinessCard'
import type { Business } from '@/lib/business'

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

    fireEvent.click(screen.getByText('555-0100'))

    expect(fetch).toHaveBeenCalledWith(
      '/api/pro/11111111-1111-1111-1111-111111111111/click',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'phone' }),
      })
    )
  })

  it('hides a stored rating on the search card so pros are not ranked against each other', () => {
    const business = makeBusiness({
      id: '77777777-7777-7777-7777-777777777777',
      source: 'manual',
      rating: 4.8,
      reviewCount: 120,
      reviewUrl: 'https://g.page/r/example/review',
    })

    render(<BusinessCard business={business} />)

    expect(screen.queryByText('4.8 · 120 reviews')).toBeNull()
    expect(screen.getByRole('link', { name: 'See reviews' })).toBeDefined()
    expect(document.body.textContent).not.toMatch(/yelp/i)
  })

  it('does not show a rating line when rating and review count are missing', () => {
    const business = makeBusiness({
      id: '99999999-9999-9999-9999-999999999999',
      rating: null,
      reviewCount: null,
    })

    render(<BusinessCard business={business} />)

    expect(document.body.textContent).not.toMatch(/reviews?/i)
  })

  it('shows a raw 10-digit US phone as (843) 657-8901 and dials +1 digits', () => {
    const business = makeBusiness({
      id: '33333333-3333-3333-3333-333333333333',
      phone: '8436578901',
    })

    render(<BusinessCard business={business} />)

    const link = screen.getByRole('link', { name: '(843) 657-8901' })
    expect(link.getAttribute('href')).toBe('tel:+18436578901')
    expect(screen.queryByText('8436578901')).toBeNull()
  })

  it('shows a See reviews link when reviewUrl is https, without changing the phone tel link', () => {
    const business = makeBusiness({
      id: '44444444-4444-4444-4444-444444444444',
      phone: '8436578901',
      reviewUrl: 'https://g.page/r/example/review',
    })

    render(<BusinessCard business={business} />)

    const review = screen.getByRole('link', { name: 'See reviews' })
    expect(review.getAttribute('href')).toBe('https://g.page/r/example/review')
    expect(review.getAttribute('target')).toBe('_blank')
    expect(review.getAttribute('rel')).toContain('noopener')

    const phone = screen.getByRole('link', { name: '(843) 657-8901' })
    expect(phone.getAttribute('href')).toBe('tel:+18436578901')
  })

  it('does not show a review link when the business has no reviewUrl', () => {
    const business = makeBusiness({
      id: '55555555-5555-5555-5555-555555555555',
    })

    render(<BusinessCard business={business} />)

    expect(screen.queryByRole('link', { name: 'See reviews' })).toBeNull()
    expect(screen.getByRole('link', { name: '555-0100' }).getAttribute('href')).toBe('tel:555-0100')
  })

  it('does not render a javascript: reviewUrl as a link', () => {
    const business = makeBusiness({
      id: '66666666-6666-6666-6666-666666666666',
      phone: '8436578901',
      reviewUrl: 'javascript:alert(document.cookie)',
    })

    render(<BusinessCard business={business} />)

    expect(screen.queryByRole('link', { name: 'See reviews' })).toBeNull()
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull()
    expect(screen.getByRole('link', { name: '(843) 657-8901' }).getAttribute('href')).toBe('tel:+18436578901')
  })
})
