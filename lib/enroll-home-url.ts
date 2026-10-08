import { formatCityLabel } from './display'

/** Home search URL after a pro activates (or revisits) their trial listing. */
export function buildEnrollHomeUrl(
  invitation: { category: string; cities: string[] },
  curatedBusinessId?: string | null
): string {
  const params = new URLSearchParams({ category: invitation.category })
  const city = invitation.cities[0]?.trim()
  if (city) params.set('location', formatCityLabel(city))
  if (curatedBusinessId) params.set('highlight', curatedBusinessId)
  return `/?${params.toString()}`
}
