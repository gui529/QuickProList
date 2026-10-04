import type { Business } from './business'
import { getCuratedById, getCuratedInArea, incrementSearchImpression } from './kv'
import { openTownSlugs, resolveOpenTown } from './open-towns'

export const MAX_RESULTS = 3

export type SearchLocation = { location: string } | { latitude: number; longitude: number }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(s: string): boolean {
  return UUID_RE.test(s)
}

function isManualPro(b: Business): boolean {
  return b.source === 'manual'
}

export async function resolveHighlight(id: string): Promise<Business | null> {
  if (!isUuid(id)) return null
  const business = await getCuratedById(id)
  if (!business || !isManualPro(business)) return null
  return business
}

export async function getMergedResults(
  where: SearchLocation,
  category: string,
  options: { highlightId?: string } = {}
): Promise<Business[]> {
  const town = 'location' in where ? resolveOpenTown(where.location) : null
  if (!town) return []

  const highlight = options.highlightId ? await resolveHighlight(options.highlightId) : null

  // Every opened town shares one pool of manually entered pros, so a
  // Kennesaw pro can show for a Marietta search. Older Yelp snapshots stay
  // in the database for the admin to remove, and are not shown here.
  const curated = (await getCuratedInArea(category, openTownSlugs())).filter(isManualPro)

  const targetSize = highlight ? MAX_RESULTS - 1 : MAX_RESULTS
  const curatedForFill = highlight
    ? curated.filter((b) => b.id !== highlight.id)
    : curated
  const merged = curatedForFill.slice(0, targetSize)

  const sliced = !highlight
    ? merged.slice(0, MAX_RESULTS)
    : [highlight, ...merged.filter((b) => b.id !== highlight.id)].slice(0, MAX_RESULTS)

  for (const b of sliced) {
    if (isUuid(b.id)) void incrementSearchImpression(b.id)
  }

  return sliced
}
