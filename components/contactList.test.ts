import { describe, expect, it } from 'vitest'
import { MONOGRAM_COLORS, monogramColor } from './contactList'

describe('monogramColor', () => {
  it('keeps the same color for the same person', () => {
    expect(monogramColor('Marcus Hale')).toBe(monogramColor('  marcus hale '))
    expect(MONOGRAM_COLORS).toContain(monogramColor('Rosa Nguyen'))
  })

  it('does not use the same color for every name', () => {
    const colors = ['Marcus Hale', 'Rosa Nguyen', 'James Tiller', 'Acme Plumbing'].map(monogramColor)
    expect(new Set(colors).size).toBeGreaterThan(1)
  })
})
