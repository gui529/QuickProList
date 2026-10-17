import { CATEGORIES, normalizeCategory } from './categories'

export function formatCityLabel(city: string): string {
  const name = city.split(',')[0].trim()
  if (!name) return city
  return name.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

export function formatCategoryLabel(value: string | null | undefined): string {
  if (!value) return ''
  const key = normalizeCategory(value)
  return CATEGORIES.find((category) => category.value === key)?.label ?? value
}

/**
 * Phrase after "look for" / "search for".
 * Profession labels already name the people ("Roofers", "Contractors"), so they
 * are not followed by another "pros". Trades that are not people ("HVAC",
 * "Pest Control") keep "pros".
 */
export function formatCategorySearchPhrase(value: string | null | undefined): string {
  const label = formatCategoryLabel(value)
  if (!label) return 'home-service pros'
  const known = CATEGORIES.find((category) => category.label === label)
  if (known && /s$/i.test(known.label)) return known.label
  return `${label} pros`
}
