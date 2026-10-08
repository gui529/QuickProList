export interface Business {
  id: string
  /** `'yelp'` only appears on legacy rows; they render from stored data. */
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
  /** Hidden from search until the pro is enrolled or put on a trial. */
  isDraft?: boolean
  proSiteEnabled?: boolean
  contactEmail?: string
  dashboardToken?: string
  photos?: string[]
}

export type SearchLocation = { location: string }
