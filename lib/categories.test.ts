import { describe, expect, it } from 'vitest'
import { normalizeCategory } from './categories'

describe('normalizeCategory', () => {
  it('maps plural plumber label to plumbing value', () => {
    expect(normalizeCategory('plumbers')).toBe('plumbing')
    expect(normalizeCategory('Plumbers')).toBe('plumbing')
  })

  it('keeps canonical values', () => {
    expect(normalizeCategory('plumbing')).toBe('plumbing')
    expect(normalizeCategory('homecleaning')).toBe('homecleaning')
  })
})
