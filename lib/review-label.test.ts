import { describe, expect, it } from 'vitest'
import { storedReviewLabel } from './review-label'

describe('storedReviewLabel', () => {
  it('joins a one-decimal rating and a review count', () => {
    expect(storedReviewLabel(4.8, 120)).toBe('4.8 · 120 reviews')
    expect(storedReviewLabel(5, 1)).toBe('5.0 · 1 review')
    expect(storedReviewLabel('5.0' as unknown as number, 7)).toBe('5.0 · 7 reviews')
  })

  it('returns null when both values are missing', () => {
    expect(storedReviewLabel(null, null)).toBeNull()
  })
})
