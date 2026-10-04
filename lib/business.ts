export interface HourPeriod {
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
  reviewUrl?: string
  categories: string[]
  cities?: string[]
  category?: string
  isTrial?: boolean
  trialEndsAt?: string | null
  proSiteEnabled?: boolean
  contactEmail?: string
  dashboardToken?: string
  hours?: HourPeriod[]
  isOpenNow?: boolean
  price?: string
  photos?: string[]
}
