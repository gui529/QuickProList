export interface OpenTown {
  name: string
  slug: string
}

/**
 * Single source of truth for the opened area around Kennesaw.
 * Acworth, Kennesaw, Marietta, and Woodstock are within about 10 miles.
 * The other towns are farther — about 15–40 minutes away. The owner asked
 * to open all of them, and every opened town shares one listing pool.
 * To open another town, add it here — nothing else changes.
 * `slug` matches how `resolveOpenTown` and `normalizeCity` compare input
 * (lowercase first segment, spaces kept), so "Fair Oaks" matches `fair oaks`.
 */
export const OPEN_TOWNS: readonly OpenTown[] = [
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
]

export const OPEN_AREA_STATE = 'GA'

const STATE_NAMES = new Set(['ga', 'georgia'])

export function resolveOpenTown(input: string | null | undefined): OpenTown | null {
  if (!input) return null
  const parts = input.split(',').map((p) => p.trim().toLowerCase())
  if (parts.length > 2 || !parts[0]) return null
  if (parts.length === 2 && !STATE_NAMES.has(parts[1])) return null
  return OPEN_TOWNS.find((t) => t.slug === parts[0]) ?? null
}

export function isOpenTown(input: string | null | undefined): boolean {
  return resolveOpenTown(input) !== null
}

export function openTownSlugs(): string[] {
  return OPEN_TOWNS.map((t) => t.slug)
}

export function formatTown(town: OpenTown): string {
  return `${town.name}, ${OPEN_AREA_STATE}`
}

export const NOT_OPEN_MESSAGE = 'QuickProList is not open there yet. Choose a town from the list.'
