import { describe, expect, it } from 'vitest'
import { computeCompleteness } from './profile-completeness'

describe('computeCompleteness', () => {
  it('scores an empty profile as 0 and leaves every current step undone', () => {
    const result = computeCompleteness({
      websiteUrl: '',
      contactEmail: null,
      reviewUrl: '   ',
      proSiteEnabled: false,
    })

    expect(result.score).toBe(0)
    expect(result.items.map((item) => item.id)).toEqual([
      'website',
      'contact-email',
      'review-link',
      'pro-site',
    ])
    expect(result.items.every((item) => item.done === false)).toBe(true)
    expect(result.items.find((item) => item.id === 'website')?.targetId).toBe('website-url')
    expect(result.items.find((item) => item.id === 'contact-email')?.targetId).toBe('contact-email')
    expect(result.items.find((item) => item.id === 'review-link')?.targetId).toBe('review-url')
    expect(result.items.find((item) => item.id === 'pro-site')?.targetId).toBeUndefined()
  })

  it('scores a partial profile from the steps that are filled in', () => {
    const result = computeCompleteness({
      websiteUrl: 'https://acme.example',
      contactEmail: ' owner@acme.example ',
      reviewUrl: '',
      proSiteEnabled: false,
    })

    expect(result.score).toBe(50)
    expect(result.items.filter((item) => item.done).map((item) => item.id)).toEqual([
      'website',
      'contact-email',
    ])
  })

  it('scores a full current profile as 100', () => {
    const result = computeCompleteness({
      websiteUrl: 'https://acme.example',
      contactEmail: 'owner@acme.example',
      reviewUrl: 'https://g.page/r/acme/review',
      proSiteEnabled: true,
    })

    expect(result.score).toBe(100)
    expect(result.items.every((item) => item.done)).toBe(true)
  })

  it('omits photo, about, services, and hours until those fields are present', () => {
    const result = computeCompleteness({
      websiteUrl: 'https://acme.example',
      contactEmail: 'owner@acme.example',
      reviewUrl: 'https://g.page/r/acme/review',
      proSiteEnabled: true,
    })

    expect(result.items.map((item) => item.id)).not.toContain('photo')
    expect(result.items.map((item) => item.id)).not.toContain('about')
    expect(result.items.map((item) => item.id)).not.toContain('services')
    expect(result.items.map((item) => item.id)).not.toContain('hours')
  })

  it('includes photo, about, services, and hours once those fields exist, including when blank', () => {
    const empty = computeCompleteness({
      websiteUrl: 'https://acme.example',
      contactEmail: null,
      reviewUrl: null,
      proSiteEnabled: false,
      imageUrl: '',
      about: '   ',
      services: [' ', ''],
      hours: [],
    })

    expect(empty.items.map((item) => item.id)).toEqual([
      'website',
      'contact-email',
      'review-link',
      'photo',
      'about',
      'services',
      'hours',
      'pro-site',
    ])
    expect(empty.score).toBe(13)
    expect(empty.items.filter((item) => item.done).map((item) => item.id)).toEqual(['website'])
    expect(empty.items.find((item) => item.id === 'photo')?.targetId).toBe('listing-photo')

    const full = computeCompleteness({
      websiteUrl: 'https://acme.example',
      contactEmail: 'owner@acme.example',
      reviewUrl: 'https://g.page/r/acme/review',
      proSiteEnabled: true,
      imageUrl: 'https://cdn.example/acme.jpg',
      about: 'Family-owned plumbing in Austin.',
      services: ['Drain cleaning'],
      hours: [{ day: 1, start: '0900', end: '1700' }],
    })

    expect(full.score).toBe(100)
    expect(full.items.every((item) => item.done)).toBe(true)
  })

  it('counts a listing photo only when imageUrl is on the record', () => {
    const withoutPhoto = computeCompleteness({ proSiteEnabled: true })
    const withEmptyPhoto = computeCompleteness({ imageUrl: '', proSiteEnabled: true })
    const withPhoto = computeCompleteness({
      websiteUrl: 'https://acme.example',
      contactEmail: 'owner@acme.example',
      reviewUrl: 'https://g.page/r/acme/review',
      imageUrl: 'https://cdn.example/acme.jpg',
      proSiteEnabled: true,
    })

    expect(withoutPhoto.items.map((item) => item.id)).not.toContain('photo')
    expect(withEmptyPhoto.items.find((item) => item.id === 'photo')?.done).toBe(false)
    expect(withPhoto.score).toBe(100)
  })
})
