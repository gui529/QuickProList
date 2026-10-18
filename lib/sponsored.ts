/** Exact disclosure from the legal draft. Shown above search results. */
export const SPONSORED_DISCLOSURE =
  'Sponsored listings are businesses in our paid listing program, including free previews.'

export const SPONSORED_BADGE = 'Sponsored'

/**
 * A listing-program pro: a free preview (`isTrial`) or a paid/trial enrollment
 * linked to this business. Manually added directory rows are not sponsored.
 */
export function isSponsoredListing(
  business: { id: string; isTrial?: boolean },
  programIds: ReadonlySet<string>
): boolean {
  return Boolean(business.isTrial) || programIds.has(business.id)
}

export function withSponsoredFlag<T extends { id: string; isTrial?: boolean }>(
  businesses: T[],
  programIds: ReadonlySet<string>
): Array<T & { sponsored: boolean }> {
  return businesses.map((business) => ({
    ...business,
    sponsored: isSponsoredListing(business, programIds),
  }))
}
