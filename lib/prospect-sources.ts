/**
 * Where a Gmail prospect's contact data came from.
 * Never Yelp. Rules: docs/prospect-sources.md.
 */
export const ALLOWED_PROSPECT_SOURCES = ['own_site', 'chamber', 'ga_sos', 'ga_license'] as const

export type AllowedProspectSource = (typeof ALLOWED_PROSPECT_SOURCES)[number]

/** True only for an exact allowlist value. Blank and Yelp (any case) are not allowed. */
export function isAllowedProspectSource(source: string | null | undefined): source is AllowedProspectSource {
  if (typeof source !== 'string') return false
  const value = source.trim()
  if (!value || value.toLowerCase() === 'yelp') return false
  return (ALLOWED_PROSPECT_SOURCES as readonly string[]).includes(value)
}
