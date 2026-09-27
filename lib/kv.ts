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

/**
 * Only accept http(s) destinations for user-suppliable URL fields
 * (`websiteUrl`, `reviewUrl`) that end up rendered as a raw anchor `href`
 * on public pages (`app/pro/[id]/page.tsx`, `components/ReviewLinkModal.tsx`).
 * A bare domain like `example.com` (no scheme) is left as-is — existing
 * render sites already prepend `https://` for those. Anything that declares
 * a non-http(s) scheme (`javascript:`, `data:`, etc.) is dropped rather than
 * stored, since that scheme would otherwise execute in a visitor's browser.
 *
 * Per the WHATWG URL spec, browsers strip ASCII tab/CR/LF characters
 * anywhere in a URL string, and also strip *leading/trailing* C0 control
 * characters (`\x00`-`\x1F`, not just tab/CR/LF) or spaces, before
 * resolving its scheme (confirmed via Node's `URL` parser, which `href`
 * resolution follows) — so an obfuscated scheme like `"java\tscript:alert(1)"`
 * or `"\x01javascript:alert(1)"` still resolves to `javascript:` on click
 * even though a naive contiguous-scheme regex wouldn't see it. Strip those
 * characters the same way before scheme-sniffing so the check can't be
 * bypassed by embedding or prefixing them around the scheme.
 */
function sanitizeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const edgeStripped = value.replace(/^[\x00-\x1F ]+/, '').replace(/[\x00-\x1F ]+$/, '')
  const trimmed = edgeStripped.replace(/[\t\r\n]/g, '').trim()
  if (!trimmed) return null
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed)
  if (schemeMatch && !/^https?$/i.test(schemeMatch[1])) return null
  return trimmed
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
  review_url: string | null
  rating: number | null
  review_count: number | null
  categories: string[] | null
  trial_ends_at: string | null
  is_trial: boolean
  pro_site_enabled: boolean
  delisted_at: string | null
  contact_email: string | null
  dashboard_token: string | null
  profile_views: number | null
  phone_clicks: number | null
  website_clicks: number | null
  directions_clicks: number | null
  search_impressions: number | null
  winback_sent_at: string | null
}

/**
 * Derive the "leave us a review" link for a curated business — an explicit
 * `review_url` always wins (the only source for manually-added pros, since
 * there's no Yelp id to derive one from); a Yelp-sourced pro without one
 * falls back to the Yelp write-a-review deep link. Returns `undefined`
 * (never a broken link) when neither is available.
 */
function reviewUrlFor(row: Pick<CuratedRow, 'source' | 'yelp_id' | 'review_url'>): string | undefined {
  if (row.review_url) return row.review_url
  if (row.source === 'yelp' && row.yelp_id) {
    return `https://www.yelp.com/writeareview/biz/${row.yelp_id}`
  }
  return undefined
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
    reviewUrl: reviewUrlFor(row),
    categories: row.categories ?? [],
    cities: row.cities ?? [],
    category: row.category,
    isTrial: row.is_trial || undefined,
    trialEndsAt: row.is_trial ? (row.trial_ends_at ?? null) : undefined,
    proSiteEnabled: row.pro_site_enabled || undefined,
    contactEmail: row.contact_email ?? undefined,
    dashboardToken: row.dashboard_token ?? undefined,
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

export interface BusinessDashboardData {
  id: string
  name: string
  source: 'yelp' | 'manual'
  isTrial: boolean
  trialEndsAt: string | null
  profileViews: number
  phoneClicks: number
  websiteClicks: number
  directionsClicks: number
  searchImpressions: number
  websiteUrl: string | null
  contactEmail: string | null
  reviewUrl: string | null
}

/**
 * Look up a curated business by its `dashboard_token` — the secret used by
 * the token-secured, no-login business-facing dashboard (`/dashboard/[token]`)
 * to show a subscriber their own profile-view/click stats and status.
 * Returns `null` on no match (including when Supabase isn't configured),
 * which the dashboard page treats as a 404.
 */
export async function getCuratedByDashboardToken(
  token: string
): Promise<BusinessDashboardData | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from('curated_businesses')
    .select('*')
    .eq('dashboard_token', token)
    .maybeSingle()
  if (!data) return null
  const row = data as CuratedRow
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    isTrial: row.is_trial,
    trialEndsAt: row.trial_ends_at,
    profileViews: row.profile_views ?? 0,
    phoneClicks: row.phone_clicks ?? 0,
    websiteClicks: row.website_clicks ?? 0,
    directionsClicks: row.directions_clicks ?? 0,
    searchImpressions: row.search_impressions ?? 0,
    websiteUrl: row.website_url ?? null,
    contactEmail: row.contact_email ?? null,
    reviewUrl: row.review_url ?? null,
  }
}

export interface DashboardEditableFields {
  websiteUrl?: string
  contactEmail?: string
  reviewUrl?: string
}

/**
 * Update the allow-listed self-serve fields (website URL, contact email,
 * review link) on a curated business, looked up by its `dashboard_token` —
 * the sole credential the token-secured `/dashboard/[token]` page grants a
 * subscriber. Deliberately excludes name/category/cities/pricing-adjacent
 * fields, which stay admin-controlled via `/admin`. Returns `false` (no-op,
 * nothing mutated) for an unknown token or when Supabase isn't configured,
 * so the caller can 404 — mirrors `getCuratedByDashboardToken`'s
 * null-on-miss convention.
 */
export async function updateCuratedByDashboardToken(
  token: string,
  fields: DashboardEditableFields
): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const update: Record<string, unknown> = {}
  if (fields.websiteUrl !== undefined) update.website_url = sanitizeHttpUrl(fields.websiteUrl)
  if (fields.contactEmail !== undefined) update.contact_email = fields.contactEmail.trim() || null
  if (fields.reviewUrl !== undefined) update.review_url = sanitizeHttpUrl(fields.reviewUrl)
  const { data, error } = await supabase
    .from('curated_businesses')
    .update(update)
    .eq('dashboard_token', token)
    .select('id')
  if (error) throw error
  return Array.isArray(data) && data.length > 0
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
  reviewUrl?: string
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
    review_url: input.reviewUrl || null,
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
  if (input.reviewUrl !== undefined) update.review_url = input.reviewUrl || null
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

/**
 * Store the contact email captured from Stripe Checkout's
 * `customer_details.email` on a curated business — the address dunning
 * notices (e.g. on `invoice.payment_failed`) are sent to. No-ops when
 * Supabase isn't configured or `email` is falsy, matching the webhook's
 * fire-and-forget-on-missing-data handling of this optional field.
 */
export async function setCuratedContactEmail(id: string, email: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !email) return
  const { error } = await supabase
    .from('curated_businesses')
    .update({ contact_email: email })
    .eq('id', id)
  if (error) throw error
}

/**
 * Bump a single integer counter column on a `curated_businesses` row by 1.
 * Supabase's JS client has no atomic increment for a plain `update()`, so
 * this reads the current value and writes back current+1 — acceptable for
 * low-contention view/click counters. No-ops (rather than throwing) when
 * Supabase isn't configured or the row can't be found, matching the
 * fire-and-forget call sites (page render, click-tracking endpoint) that
 * should never fail a request over a missed counter increment.
 */
async function incrementCounterColumn(id: string, column: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  const { data } = await supabase
    .from('curated_businesses')
    .select(column)
    .eq('id', id)
    .maybeSingle()
  if (!data) return
  const current = (data as unknown as Record<string, number | null>)[column] ?? 0
  await supabase
    .from('curated_businesses')
    .update({ [column]: current + 1 })
    .eq('id', id)
}

export async function incrementProfileView(id: string): Promise<void> {
  await incrementCounterColumn(id, 'profile_views')
}

/**
 * Bump a curated business's `search_impressions` counter — fired whenever
 * the business appears in a merged search-results page, regardless of
 * whether its ProSite is enabled. Unlike `incrementProfileView` (ProSite
 * page views only), this gives every curated/paying business a non-zero
 * dashboard stat even if they never enabled ProSite.
 */
export async function incrementSearchImpression(id: string): Promise<void> {
  await incrementCounterColumn(id, 'search_impressions')
}

export type ContactClickType = 'phone' | 'website' | 'directions'

export async function incrementContactClick(id: string, type: ContactClickType): Promise<void> {
  await incrementCounterColumn(id, `${type}_clicks`)
}

/**
 * Mark a curated business as having received its (one-time) win-back email
 * — sent by `lib/winback.ts` when a business's free trial expired without
 * ever converting to a paid subscription. Setting `winback_sent_at` makes
 * later runs of the win-back job skip this business, so re-running it never
 * sends a second email to the same business.
 */
export async function setWinbackSent(id: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('curated_businesses')
    .update({ winback_sent_at: new Date().toISOString() })
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
