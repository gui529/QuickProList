import { describe, expect, it } from 'vitest'
import { OPEN_TOWNS, isOpenTown, resolveOpenTown } from './open-towns'

describe('open towns', () => {
  it.each(['Acworth', 'Kennesaw', 'Marietta', 'Woodstock'])('accepts %s', (name) => {
    expect(isOpenTown(name)).toBe(true)
    expect(isOpenTown(`${name}, GA`)).toBe(true)
    expect(isOpenTown(`  ${name.toUpperCase()} , Georgia`)).toBe(true)
  })

  it.each(['Smyrna', 'Canton', 'Atlanta', 'Atlanta, GA', 'Marietta, OH', 'Austin, TX', '', 'Kennesaw, GA, US'])(
    'rejects %j',
    (input) => {
      expect(isOpenTown(input)).toBe(false)
    }
  )

  it('lists exactly the four opened towns', () => {
    expect(OPEN_TOWNS.map((t) => t.name)).toEqual(['Acworth', 'Kennesaw', 'Marietta', 'Woodstock'])
    expect(resolveOpenTown('marietta')?.slug).toBe('marietta')
  })
})
