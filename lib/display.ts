import { CATEGORIES } from './categories'

export function formatCityLabel(city: string): string {
  const name = city.split(',')[0].trim()
  if (!name) return city
  return name.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

export function formatCategoryLabel(value: string | null | undefined): string {
  if (!value) return ''
  return CATEGORIES.find((category) => category.value === value)?.label ?? value
}
