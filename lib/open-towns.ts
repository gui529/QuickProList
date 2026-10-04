export interface OpenTown {
  name: string
  slug: string
}

/**
 * Single source of truth for the opened area: Kennesaw and the towns within
 * about 10 miles. To open another town, add it here — nothing else changes.
 * `slug` matches how curated businesses store cities (see `normalizeCity`).
 */
export const OPEN_TOWNS: readonly OpenTown[] = [
  { name: 'Acworth', slug: 'acworth' },
  { name: 'Kennesaw', slug: 'kennesaw' },
  { name: 'Marietta', slug: 'marietta' },
  { name: 'Woodstock', slug: 'woodstock' },
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

export function listOpenTownNames(): string {
  const names = OPEN_TOWNS.map((t) => t.name)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')}, or ${names[names.length - 1]}`
}

export const NOT_OPEN_MESSAGE = `QuickProList is not open there yet. Try ${listOpenTownNames()}.`
