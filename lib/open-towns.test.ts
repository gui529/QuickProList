import { describe, expect, it } from 'vitest'
import { NOT_OPEN_MESSAGE, OPEN_TOWNS, isOpenTown, resolveOpenTown } from './open-towns'

const OPEN_NAMES = [
  'Acworth',
  'Kennesaw',
  'Marietta',
  'Woodstock',
  'Emerson',
  'Fair Oaks',
  'Holly Springs',
  'Smyrna',
  'Vinings',
  'Cartersville',
  'Canton',
  'Dallas',
  'Roswell',
  'Powder Springs',
  'Hiram',
  'Austell',
  'Mableton',
  'Ball Ground',
  'Alpharetta',
]

describe('open towns', () => {
  it.each(OPEN_NAMES)('accepts %s', (name) => {
    expect(isOpenTown(name)).toBe(true)
    expect(isOpenTown(`${name}, GA`)).toBe(true)
    expect(isOpenTown(`  ${name.toUpperCase()} , Georgia`)).toBe(true)
    expect(resolveOpenTown(name)?.slug).toBe(name.toLowerCase())
  })

  it.each(['Atlanta', 'Atlanta, GA', 'Marietta, OH', 'Austin, TX', '', 'Kennesaw, GA, US'])(
    'rejects %j',
    (input) => {
      expect(isOpenTown(input)).toBe(false)
    }
  )

  it('lists every opened town, including multi-word names with their spaces', () => {
    expect(OPEN_TOWNS.map((t) => t.name)).toEqual(OPEN_NAMES)
    expect(resolveOpenTown('Fair Oaks, GA')?.slug).toBe('fair oaks')
    expect(resolveOpenTown('  BALL GROUND , Georgia')?.slug).toBe('ball ground')
  })

  it('keeps the closed-town message short instead of naming every town', () => {
    expect(NOT_OPEN_MESSAGE).toMatch(/not open there yet/i)
    expect(NOT_OPEN_MESSAGE.length).toBeLessThan(120)
    for (const town of OPEN_TOWNS) {
      expect(NOT_OPEN_MESSAGE).not.toContain(town.name)
    }
  })
})
