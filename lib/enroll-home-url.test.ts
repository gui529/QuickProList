import { describe, expect, it } from 'vitest'
import { buildEnrollHomeUrl } from './enroll-home-url'

describe('buildEnrollHomeUrl', () => {
  it('includes category, formatted location, and optional highlight', () => {
    const url = buildEnrollHomeUrl(
      { category: 'plumbing', cities: ['acworth'] },
      'curated-99'
    )
    expect(url).toBe('/?category=plumbing&location=Acworth&highlight=curated-99')
  })
})
