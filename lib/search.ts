import type { Business, SearchLocation } from './business'
import { getCuratedById, getCuratedInArea, incrementSearchImpression } from './kv'
import { openTownSlugs, resolveOpenTown } from './open-towns'

export const MAX_RESULTS = 3

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(s: string): boolean {
  return UUID_RE.test(s)
}

export async function resolveHighlight(id: string): Promise<Business | null> {
  if (!isUuid(id)) return null
  return getCuratedById(id)
}

/**
 * Search returns only pros an admin added (rows in `curated_businesses`).
 * Every opened town shares one pool of pros, so a Kennesaw pro can show for a
 * Marietta search. A requested highlight is pinned first.
 */
export async function getMergedResults(
  where: SearchLocation,
  category: string,
  options: { highlightId?: string } = {}
): Promise<Business[]> {
  const town = resolveOpenTown(where.location)
  if (!town) return []

  const highlight = options.highlightId ? await resolveHighlight(options.highlightId) : null
  const curated = await getCuratedInArea(category, openTownSlugs())

  const rest = highlight ? curated.filter((b) => b.id !== highlight.id) : curated
  const results = (highlight ? [highlight, ...rest] : rest).slice(0, MAX_RESULTS)

  // Fire-and-forget: record a search-result impression for every pro surfaced
  // here, regardless of whether its ProSite is enabled.
  for (const b of results) {
    if (isUuid(b.id)) void incrementSearchImpression(b.id)
  }

  return results
}
