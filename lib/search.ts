import type { Business, SearchLocation } from './business'
import { normalizeCategory } from './categories'
import { listingProgramBusinessIds } from './invitations'
import { isUuid } from './is-uuid'
import { getCuratedById, getCuratedInArea, incrementSearchImpression } from './kv'
import { openTownSlugs, resolveOpenTown } from './open-towns'
import { hourBucket, orderByTownThenRotation, rotationSeed } from './rotation'
import { withSponsoredFlag } from './sponsored'

export const MAX_RESULTS = 3

export { isUuid }

export async function resolveHighlight(id: string): Promise<Business | null> {
  if (!isUuid(id)) return null
  return getCuratedById(id, { live: true })
}

/**
 * Search returns only pros an admin added (rows in `curated_businesses`).
 * Every opened town shares one pool. Pros whose cities include the searched
 * town fill the slots first, then the rest of the open area. Within each
 * group the order rotates by category and UTC hour. A live highlight is pinned
 * first. Highlight, town match, then rotation. No paid or trial ranking.
 */
export async function getMergedResults(
  where: SearchLocation,
  category: string,
  options: { highlightId?: string; now?: Date } = {}
): Promise<Business[]> {
  const town = resolveOpenTown(where.location)
  if (!town) return []

  const highlight = options.highlightId ? await resolveHighlight(options.highlightId) : null
  const curated = await getCuratedInArea(category, openTownSlugs())
  const seed = rotationSeed(normalizeCategory(category), hourBucket(options.now))
  const ordered = orderByTownThenRotation(curated, town.slug, seed)

  const rest = highlight ? ordered.filter((b) => b.id !== highlight.id) : ordered
  const merged = (highlight ? [highlight, ...rest] : rest).slice(0, MAX_RESULTS)
  const programIds = await listingProgramBusinessIds(merged.filter((b) => !b.isTrial).map((b) => b.id))
  const results = withSponsoredFlag(merged, programIds)

  // Fire-and-forget: record a search-result impression for every pro surfaced
  // here, regardless of whether its ProSite is enabled.
  for (const b of results) {
    if (isUuid(b.id)) void incrementSearchImpression(b.id)
  }

  return results
}
