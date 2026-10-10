/** Keep in sync with QuickProList `lib/categories.ts` when trades change. */
export const CATEGORIES = [
  { label: 'Plumbers', value: 'plumbing', term: 'plumber' },
  { label: 'Electricians', value: 'electricians', term: 'electrician' },
  { label: 'HVAC', value: 'airconditioningheating', term: 'HVAC' },
  { label: 'Roofers', value: 'roofing', term: 'roofing' },
  { label: 'Painters', value: 'paintingcontractors', term: 'painter' },
  { label: 'Landscapers', value: 'landscaping', term: 'landscaping' },
  { label: 'Pest Control', value: 'pestcontrol', term: 'pest control' },
  { label: 'Cleaners', value: 'homecleaning', term: 'home cleaning' },
  { label: 'Contractors', value: 'generalcontractors', term: 'contractor' },
  { label: 'Locksmiths', value: 'locksmiths', term: 'locksmith' },
]

export function normalizeCategory(input: string): string {
  const key = input.trim().toLowerCase()
  const known = CATEGORIES.find(
    (c) => c.value === key || c.label.toLowerCase() === key || c.term.toLowerCase() === key
  )
  return known ? known.value : key
}
