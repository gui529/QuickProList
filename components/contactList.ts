import type { Business } from '@/lib/yelp'

/** Sentence case for a category term. HVAC stays HVAC. */
export function sentenceTrade(term: string): string {
  if (term === term.toUpperCase()) return term
  return term.charAt(0).toUpperCase() + term.slice(1)
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
