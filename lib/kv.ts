import { createClient } from '@supabase/supabase-js'
import type { Business } from './yelp'

const PHOTO_BUCKET = 'business-photos'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export function normalizeCity(input: string): string {
  return input.trim().toLowerCase().split(',')[0].trim()
}

interface CuratedRow {
  id: string
  yelp_id: string | null
  source: 'yelp' | 'manual'
  category: string
  cities: string[]
  name: string
  phone: string | null
  address: string | null
  image_url: string | null
  website_url: string | null
  rating: number | null
  review_count: number | null
  categories: string[] | null
  trial_ends_at: string | null
  is_trial: boolean
  pro_site_enabled: boolean
  delisted_at: string | null
}

function rowToBusiness(row: CuratedRow): Business {
  const isYelp = row.source === 'yelp'
  // For Yelp businesses, reconstruct the Yelp URL from yelpId.
  // website_url stores the actual business website (not the Yelp listing).
  // Old rows may have stored the Yelp URL in website_url — skip those.
  const websiteUrl =
    row.website_url && !row.website_url.includes('yelp.com')
      ? row.website_url
      : undefined
  return {
    id: row.id,
    source: row.source,
    yelpId: row.yelp_id ?? undefined,
    name: row.name,
    rating: row.rating,
    reviewCount: row.review_count,
    phone: row.phone ?? '',
    address: row.address ?? '',
    imageUrl: row.image_url ?? '',
    url: isYelp && row.yelp_id ? `https://www.yelp.com/biz/${row.yelp_id}` : '',
    websiteUrl,
    categories: row.categories ?? [],
    cities: row.cities ?? [],
    category: row.category,
    isTrial: row.is_trial || undefined,
    trialEndsAt: row.is_trial ? (row.trial_ends_at ?? null) : undefined,
    proSiteEnabled: row.pro_site_enabled || undefined,
  }
}

export async function getCurated(category: string, city: string): Promise<Business[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('curated_businesses')
    .select('*')
    .eq('category', category)
    .contains('cities', [normalizeCity(city)])
    .is('delisted_at', null)
    .or(`trial_ends_at.is.null,trial_ends_at.gt.${now}`)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return (data as CuratedRow[]).map(rowToBusiness)
}

export async function getCuratedById(id: string): Promise<Business | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from('curated_businesses')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  return rowToBusiness(data as CuratedRow)
}

export async function listAllCurated(): Promise<Business[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from('curated_businesses')
    .select('*')
    .order('created_at', { ascending: false })
  return ((data as CuratedRow[]) ?? []).map(rowToBusiness)
}

export async function addCuratedFromYelp(
  business: Business,
  category: string,
  cities: string[],
  trialEndsAt?: string | null
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const normalizedCities = [...new Set(cities.map(normalizeCity).filter(Boolean))]
  if (normalizedCities.length === 0) throw new Error('At least one city is required')
  const { error } = await supabase.from('curated_businesses').upsert(
    {
      yelp_id: business.id,
      source: 'yelp',
      category,
      cities: normalizedCities,
      name: business.name,
      phone: business.phone || null,
      address: business.address || null,
      image_url: business.imageUrl || null,
      website_url: business.websiteUrl || null,
      rating: business.rating,
      review_count: business.reviewCount,
      categories: business.categories,
      trial_ends_at: trialEndsAt ?? null,
      is_trial: trialEndsAt !== undefined,
    },
    { onConflict: 'yelp_id' }
  )
  if (error) throw error
}

export interface ManualBusinessInput {
  name: string
  phone?: string
  address?: string
  websiteUrl?: string
  imageUrl?: string
  category: string
  cities: string[]
  categories?: string[]
  trialEndsAt?: string | null
}

export async function addCuratedManual(input: ManualBusinessInput): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const cities = input.cities.map(normalizeCity).filter(Boolean)
  if (cities.length === 0) throw new Error('At least one city is required')
  const { error } = await supabase.from('curated_businesses').insert({
    source: 'manual',
    category: input.category,
    cities,
    name: input.name,
    phone: input.phone || null,
    address: input.address || null,
    image_url: input.imageUrl || null,
    website_url: input.websiteUrl || null,
    categories: input.categories ?? [],
    trial_ends_at: input.trialEndsAt ?? null,
    is_trial: input.trialEndsAt !== undefined,
  })
  if (error) throw error
}

export async function updateCuratedManual(id: string, input: Partial<ManualBusinessInput>): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const update: Record<string, unknown> = {}
  if (input.name !== undefined) update.name = input.name
  if (input.phone !== undefined) update.phone = input.phone || null
  if (input.address !== undefined) update.address = input.address || null
  if (input.websiteUrl !== undefined) update.website_url = input.websiteUrl || null
  if (input.imageUrl !== undefined) update.image_url = input.imageUrl || null
  if (input.category !== undefined) update.category = input.category
  if (input.cities !== undefined) update.cities = input.cities.map(normalizeCity).filter(Boolean)
  if (input.categories !== undefined) update.categories = input.categories
  const { error } = await supabase.from('curated_businesses').update(update).eq('id', id)
  if (error) throw error
}

export async function updateCuratedCities(id: string, cities: string[]): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const normalized = cities.map(normalizeCity).filter(Boolean)
  if (normalized.length === 0) throw new Error('At least one city is required')
  const { error } = await supabase
    .from('curated_businesses')
    .update({ cities: normalized })
    .eq('id', id)
  if (error) throw error
}

export async function removeCurated(id: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  // Nullify FK before delete to avoid constraint violation from linked invitations
  await supabase
    .from('enrollment_invitations')
    .update({ curated_business_id: null })
    .eq('curated_business_id', id)
  const { error } = await supabase.from('curated_businesses').delete().eq('id', id)
  if (error) throw error
}

export async function updateProSiteEnabled(id: string, enabled: boolean): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('curated_businesses')
    .update({ pro_site_enabled: enabled })
    .eq('id', id)
  if (error) throw error
}

/**
 * Hide (or restore) a curated business without deleting its row — used when
 * a subscription is canceled/expired via the Stripe webhook. Hidden rows are
 * filtered out of `getCurated`, mirroring the `trial_ends_at` pattern, but
 * remain in `listAllCurated` for admin visibility/audit history.
 */
export async function setCuratedDelisted(id: string, delisted: boolean): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('curated_businesses')
    .update({ delisted_at: delisted ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

export async function uploadBusinessPhoto(
  file: ArrayBuffer,
  contentType: string,
  filename: string
): Promise<string> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const ext = filename.split('.').pop() ?? 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType, upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
