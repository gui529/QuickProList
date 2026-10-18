import { redirect } from 'next/navigation'
import { normalizeCategory } from '@/lib/categories'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; category?: string; lat?: string; lng?: string; highlight?: string }>
}) {
  const { location, category, lat, lng, highlight } = await searchParams

  const params = new URLSearchParams()
  if (location) params.set('location', location)
  if (category) params.set('category', normalizeCategory(category))
  if (lat) params.set('lat', lat)
  if (lng) params.set('lng', lng)
  if (highlight) params.set('highlight', highlight)

  redirect(`/?${params.toString()}`)
}
