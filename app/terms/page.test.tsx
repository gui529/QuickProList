// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import TermsPage, { metadata } from './page'

describe('Terms of Service', () => {
  afterEach(() => cleanup())

  it('uses the paid-listing wording and does not say featured', () => {
    expect(metadata.description).toBe('Terms governing use of QuickProList and paid business listings.')
    render(<TermsPage />)
    const text = (document.body.textContent ?? '').replace(/\s+/g, ' ')
    expect(text).toContain('a business enrolling in a paid listing')
    expect(text).toContain(
      'Results include businesses we have added to our directory, including businesses in our paid listing program.'
    )
    expect(text).toContain(
      'Listings in our paid listing program, including free previews, are labeled "Sponsored" and may be shown ahead of other results. Payment affects whether and where a listing appears; it is not a recommendation. We do not perform background checks or license verification.'
    )
    expect(text).toContain('Paid listings for businesses')
    expect(text).toContain('Paid listings are billed')
    expect(text).toContain(
      'You may cancel at any time online using the cancellation link in your subscription confirmation email, or by emailing'
    )
    expect(text).toContain(
      'If you subscribe during a free preview, billing starts on the day you subscribe and any remaining preview days are not added on.'
    )
    expect(text).toContain(
      'We may offer a free 30-day preview. No payment information is collected during the preview, and you will not be charged. If the preview ends without a paid subscription, the listing is removed from search results automatically. One free preview per business.'
    )
    expect(text).toContain('about paid listings')
    expect(text).not.toMatch(/featured/i)
    expect(text).not.toContain('Manage billing')
  })
})
