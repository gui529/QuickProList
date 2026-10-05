export const CATEGORIES = [
  { label: 'Plumbers', value: 'plumbing', term: 'plumber', icon: '🔧' },
  { label: 'Electricians', value: 'electricians', term: 'electrician', icon: '⚡' },
  { label: 'HVAC', value: 'airconditioningheating', term: 'HVAC', icon: '❄️' },
  { label: 'Roofers', value: 'roofing', term: 'roofing', icon: '🏠' },
  { label: 'Painters', value: 'paintingcontractors', term: 'painter', icon: '🖌️' },
  { label: 'Landscapers', value: 'landscaping', term: 'landscaping', icon: '🌿' },
  { label: 'Pest Control', value: 'pestcontrol', term: 'pest control', icon: '🐛' },
  { label: 'Cleaners', value: 'homecleaning', term: 'home cleaning', icon: '🧹' },
  { label: 'Contractors', value: 'generalcontractors', term: 'contractor', icon: '🏗️' },
  { label: 'Locksmiths', value: 'locksmiths', term: 'locksmith', icon: '🔑' },
]

/**
 * Canonical key for comparing categories case-insensitively and ignoring
 * surrounding whitespace. Known category labels/terms ("Cleaners",
 * "home cleaning") resolve to their stored value ("homecleaning").
 */
export function normalizeCategory(input: string): string {
  const key = input.trim().toLowerCase()
  const known = CATEGORIES.find(
    (c) => c.value === key || c.label.toLowerCase() === key || c.term.toLowerCase() === key
  )
  return known ? known.value : key
}
