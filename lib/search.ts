import { getBusinessById, searchBusinesses, type Business, type SearchLocation } from './yelp'
import { getCuratedById, getCuratedInArea, incrementSearchImpression } from './kv'
import { CATEGORIES } from './categories'
import { formatTown, openTownSlugs, resolveOpenTown } from './open-towns'

export const MAX_RESULTS = 3

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(s: string): boolean {
  return UUID_RE.test(s)
}

export async function resolveHighlight(id: string): Promise<Business | null> {
  if (isUuid(id)) return getCuratedById(id)
  return getBusinessById(id)
}

function isHighlightedBusiness(b: Business, highlight: Business): boolean {
  if (b.id === highlight.id) return true
  const highlightYelp = highlight.yelpId ?? (highlight.source === 'yelp' ? highlight.id : undefined)
  const bYelp = b.yelpId ?? (b.source === 'yelp' ? b.id : undefined)
  return Boolean(highlightYelp && bYelp && highlightYelp === bYelp)
}

export async function getMergedResults(
  where: SearchLocation,
  category: string,
  options: { highlightId?: string } = {}
): Promise<Business[]> {
  const term = CATEGORIES.find((c) => c.value === category)?.term ?? category
  const town = 'location' in where ? resolveOpenTown(where.location) : null
  if (!town) return []

  const highlight = options.highlightId ? await resolveHighlight(options.highlightId) : null

  // Every opened town shares one pool of curated pros, so a Kennesaw pro can
  // show for a Marietta search. Yelp is still asked about the searched town only.
  const curated = await getCuratedInArea(category, openTownSlugs())
  where = { location: formatTown(town) }

  const targetSize = highlight ? MAX_RESULTS - 1 : MAX_RESULTS
  // Drop the highlight from the fill pool first so dedupe does not leave an
  // empty slot. It is pinned back into one of the MAX_RESULTS positions below.
  const curatedForFill = highlight ? curated.filter((b) => !isHighlightedBusiness(b, highlight)) : curated
  let merged: Business[]

  if (curatedForFill.length >= targetSize) {
    merged = curatedForFill.slice(0, targetSize)
  } else {
    // One request, past the cap, so a leading run of curated or highlighted
    // duplicates can be dropped and later names in that same response can
    // still fill the list. A short remainder stays short — nothing is padded.
    const yelp = await searchBusinesses(where, category, term, MAX_RESULTS * 2)
    const curatedYelpIds = new Set(curated.map((b) => b.yelpId).filter(Boolean) as string[])
    const seenYelpIds = new Set<string>()
    const yelpFiltered = yelp.filter((b) => {
      if (curatedYelpIds.has(b.id)) return false
      if (highlight && isHighlightedBusiness(b, highlight)) return false
      if (seenYelpIds.has(b.id)) return false
      seenYelpIds.add(b.id)
      return true
    })
    merged = [...curatedForFill, ...yelpFiltered.slice(0, targetSize - curatedForFill.length)]
  }

  const sliced = !highlight
    ? merged.slice(0, MAX_RESULTS)
    : (() => {
        const highlightYelp = highlight.yelpId ?? (highlight.source === 'yelp' ? highlight.id : undefined)
        const deduped = merged.filter((b) => {
          if (b.id === highlight.id) return false
          const bYelp = b.yelpId ?? (b.source === 'yelp' ? b.id : undefined)
          if (highlightYelp && bYelp && highlightYelp === bYelp) return false
          return true
        })
        return [highlight, ...deduped].slice(0, MAX_RESULTS)
      })()

  // Fire-and-forget: record a search-result impression for every curated
  // (paying) business surfaced here, regardless of whether its ProSite is
  // enabled — `incrementProfileView` only fires on the /pro/[id] page, which
  // would otherwise leave a pinned-but-ProSite-less business's dashboard
  // stuck at all-zero stats forever.
  for (const b of sliced) {
    if (isUuid(b.id)) void incrementSearchImpression(b.id)
  }

  return sliced
}
