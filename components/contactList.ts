import type { Business } from '@/lib/yelp'

/** Sentence case for a category term. HVAC stays HVAC. */
export function sentenceTrade(term: string): string {
  if (term === term.toUpperCase()) return term
  return term.charAt(0).toUpperCase() + term.slice(1)
}

/** Apple system colors for a person with no photo. Red and yellow are omitted. */
export const MONOGRAM_COLORS = [
  '#007AFF',
  '#34C759',
  '#FF9500',
  '#AF52DE',
  '#FF2D55',
  '#30B0C7',
  '#5856D6',
] as const

/** Stable color for a name. The same person is always the same color. */
export function monogramColor(name: string): string {
  const key = name.trim().toLowerCase()
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (Math.imul(hash, 31) + key.charCodeAt(i)) >>> 0
  }
  return MONOGRAM_COLORS[hash % MONOGRAM_COLORS.length]
}

/** First + second word initials. A single word uses its first two letters. */
export function contactInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

/** Secondary-line rating. Manual businesses and missing ratings contribute nothing. */
export function ratingSuffix(business: Business): string {
  if (business.source === 'manual' || business.rating == null) return ''
  let text = ` · ${business.rating.toFixed(1)}`
  if (business.reviewCount != null) text += ` (${business.reviewCount.toLocaleString()})`
  return text
}
