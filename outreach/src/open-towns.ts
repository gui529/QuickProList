/** Keep in sync with QuickProList `lib/open-towns.ts` when markets change. */
export const OPEN_TOWNS = [
  { name: 'Acworth', slug: 'acworth' },
  { name: 'Kennesaw', slug: 'kennesaw' },
  { name: 'Marietta', slug: 'marietta' },
  { name: 'Woodstock', slug: 'woodstock' },
  { name: 'Emerson', slug: 'emerson' },
  { name: 'Fair Oaks', slug: 'fair oaks' },
  { name: 'Holly Springs', slug: 'holly springs' },
  { name: 'Smyrna', slug: 'smyrna' },
  { name: 'Vinings', slug: 'vinings' },
  { name: 'Cartersville', slug: 'cartersville' },
  { name: 'Canton', slug: 'canton' },
  { name: 'Dallas', slug: 'dallas' },
  { name: 'Roswell', slug: 'roswell' },
  { name: 'Powder Springs', slug: 'powder springs' },
  { name: 'Hiram', slug: 'hiram' },
  { name: 'Austell', slug: 'austell' },
  { name: 'Mableton', slug: 'mableton' },
  { name: 'Ball Ground', slug: 'ball ground' },
  { name: 'Alpharetta', slug: 'alpharetta' },
  { name: 'Atlanta', slug: 'atlanta' },
] as const

export const OPEN_AREA_STATE = 'GA'

const STATE_NAMES = new Set(['ga', 'georgia'])

export function isOpenTown(input: string | null | undefined): boolean {
  if (!input) return false
  const parts = input.split(',').map((p) => p.trim().toLowerCase())
  if (parts.length > 2 || !parts[0]) return false
  if (parts.length === 2 && !STATE_NAMES.has(parts[1])) return false
  return OPEN_TOWNS.some((t) => t.slug === parts[0])
}

export function formatCityLabel(city: string): string {
  const name = city.split(',')[0].trim()
  if (!name) return city
  return name.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}
