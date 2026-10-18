import { describe, expect, it } from 'vitest'
import { isSponsoredListing, SPONSORED_BADGE, SPONSORED_DISCLOSURE, withSponsoredFlag } from './sponsored'

describe('sponsored listings', () => {
  it('labels paid program listings and free previews, not manual directory rows', () => {
    const program = new Set(['paid-1'])
    expect(isSponsoredListing({ id: 'paid-1' }, program)).toBe(true)
    expect(isSponsoredListing({ id: 'preview-1', isTrial: true }, new Set())).toBe(true)
    expect(isSponsoredListing({ id: 'manual-1' }, program)).toBe(false)

    const labeled = withSponsoredFlag(
      [
        { id: 'paid-1', name: 'Paid' },
        { id: 'preview-1', name: 'Preview', isTrial: true },
        { id: 'manual-1', name: 'Manual' },
      ],
      program
    )
    expect(labeled.map((b) => b.sponsored)).toEqual([true, true, false])
    expect(SPONSORED_BADGE).toBe('Sponsored')
    expect(SPONSORED_DISCLOSURE).toBe(
      'Sponsored listings are businesses in our paid listing program, including free previews.'
    )
  })
})
