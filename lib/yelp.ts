export interface YelpHourPeriod {
  day: number
  start: string
  end: string
  is_overnight?: boolean
}

export interface Business {
  id: string
  source: 'yelp' | 'manual'
  yelpId?: string
  name: string
  rating: number | null
  reviewCount: number | null
  phone: string
  address: string
  imageUrl: string
  url: string
  websiteUrl?: string
  categories: string[]
  cities?: string[]
  category?: string
  isTrial?: boolean
  trialEndsAt?: string | null
  proSiteEnabled?: boolean
  contactEmail?: string
  hours?: YelpHourPeriod[]
  isOpenNow?: boolean
  price?: string
  photos?: string[]
}

export type SearchLocation = { location: string } | { latitude: number; longitude: number }

export async function searchBusinesses(
  where: SearchLocation,
  category: string | undefined,
  term: string,
  limit = 20
): Promise<Business[]> {
  const params = new URLSearchParams({
    term,
    limit: String(limit),
    sort_by: 'best_match',
  })
  if (category) params.set('categories', category)

  if ('location' in where) {
    params.set('location', where.location)
  } else {
    params.set('latitude', String(where.latitude))
    params.set('longitude', String(where.longitude))
  }

  const res = await fetch(
    `https://api.yelp.com/v3/businesses/search?${params}`,
    {
      headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` },
      next: { revalidate: 300 },
    }
  )

  if (!res.ok) throw new Error(`Yelp API error: ${res.status}`)

  const data = await res.json()

  return (data.businesses ?? []).map(yelpToBusiness)
}

function yelpToBusiness(b: Record<string, unknown>): Business {
  const hoursArr = b.hours as { open: YelpHourPeriod[]; is_open_now: boolean }[] | undefined
  return {
    id: b.id as string,
    source: 'yelp',
    name: b.name as string,
    rating: (b.rating as number) ?? null,
    reviewCount: (b.review_count as number) ?? null,
    phone: (b.display_phone as string) ?? '',
    address: (b.location as Record<string, string[]>)?.display_address?.join(', ') ?? '',
    imageUrl: (b.image_url as string) ?? '',
    url: (b.url as string) ?? '',
    websiteUrl: (b.website as string) || undefined,
    categories: ((b.categories as { title: string }[]) ?? []).map((c) => c.title),
    hours: hoursArr?.[0]?.open,
    isOpenNow: hoursArr?.[0]?.is_open_now,
    price: (b.price as string) || undefined,
    photos: (b.photos as string[]) || undefined,
  }
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const res = await fetch(`https://api.yelp.com/v3/businesses/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` },
    next: { revalidate: 3600 },
  })
  if (res.status === 404) return null
  if (!res.ok) return null
  const data = (await res.json()) as Record<string, unknown>
  if (!data.id) return null
  return yelpToBusiness(data)
}
