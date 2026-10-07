import type { Business } from './business'
import { normalizeCategory } from './categories'
import { isDatabaseConfigured, query } from './db'
import { sanitizeHttpUrl } from './http-url'
import { isStorageConfigured, uploadPublicObject } from './storage'

const COUNTER_COLUMNS = new Set([
  'profile_views',
  'phone_clicks',
  'website_clicks',
  'directions_clicks',
  'search_impressions',
])

export function normalizeCity(input: string): string {
  return input.trim().toLowerCase().split(',')[0].trim()
}

function matchesArea(row: CuratedRow, categoryKey: string, cityKeys: Set<string>): boolean {
  if (normalizeCategory(row.category ?? '') !== categoryKey) return false
  return (row.cities ?? []).some((c) => cityKeys.has(normalizeCity(c)))
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

/** The explicit `review_url` is the only source of a review link. */
function reviewUrlFor(row: Pick<CuratedRow, 'review_url'>): string | undefined {
  return row.review_url || undefined
}

function rowToBusiness(row: CuratedRow): Business {
  // Old rows may have stored a Yelp listing URL in website_url — skip those.
  const websiteUrl =
    row.website_url && !row.website_url.includes('yelp.com')
      ? row.website_url
      : undefined
  return {
    id: row.id,
    source: row.source,
    yelpId: row.yelp_id ?? undefined,
    name: row.name,
    rating: row.rating == null ? null : Number(row.rating),
    reviewCount: row.review_count == null ? null : Number(row.review_count),
    phone: row.phone ?? '',
    address: row.address ?? '',
    imageUrl: row.image_url ?? '',
    url: '',
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

async function fetchActiveRows(label: string): Promise<CuratedRow[]> {
  if (!isDatabaseConfigured()) return []
  const now = new Date().toISOString()
  try {
    return await query<CuratedRow>(
      `SELECT * FROM curated_businesses
       WHERE delisted_at IS NULL
         AND (trial_ends_at IS NULL OR trial_ends_at > $1)
       ORDER BY created_at ASC`,
      [now]
    )
  } catch (error) {
    console.error(`${label} failed:`, error)
    return []
  }
}

export async function getCurated(category: string, city: string): Promise<Business[]> {
  const categoryKey = normalizeCategory(category)
  const cityKeys = new Set([normalizeCity(city)])
  const rows = await fetchActiveRows('getCurated')
  return rows.filter((r) => matchesArea(r, categoryKey, cityKeys)).map(rowToBusiness)
}

export async function getCuratedInArea(category: string, cities: string[]): Promise<Business[]> {
  const categoryKey = normalizeCategory(category)
  const cityKeys = new Set(cities.map(normalizeCity))
  const rows = await fetchActiveRows('getCuratedInArea')
  return rows.filter((r) => matchesArea(r, categoryKey, cityKeys)).map(rowToBusiness)
}

export async function getCuratedById(id: string): Promise<Business | null> {
  if (!isDatabaseConfigured()) return null
  const rows = await query<CuratedRow>(
    'SELECT * FROM curated_businesses WHERE id = $1',
    [id]
  )
  return rows[0] ? rowToBusiness(rows[0]) : null
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
 * Returns `null` on no match (including when the database isn't configured),
 * which the dashboard page treats as a 404.
 */
export async function getCuratedByDashboardToken(
  token: string
): Promise<BusinessDashboardData | null> {
  if (!isDatabaseConfigured()) return null
  const rows = await query<CuratedRow>(
    'SELECT * FROM curated_businesses WHERE dashboard_token = $1',
    [token]
  )
  const row = rows[0]
  if (!row) return null
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
 * nothing mutated) for an unknown token or when the database isn't configured,
 * so the caller can 404 — mirrors `getCuratedByDashboardToken`'s
 * null-on-miss convention.
 */
export async function updateCuratedByDashboardToken(
  token: string,
  fields: DashboardEditableFields
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false
  const sets: string[] = []
  const params: unknown[] = []
  if (fields.websiteUrl !== undefined) {
    params.push(sanitizeHttpUrl(fields.websiteUrl))
    sets.push(`website_url = $${params.length}`)
  }
  if (fields.contactEmail !== undefined) {
    params.push(fields.contactEmail.trim() || null)
    sets.push(`contact_email = $${params.length}`)
  }
  if (fields.reviewUrl !== undefined) {
    params.push(sanitizeHttpUrl(fields.reviewUrl))
    sets.push(`review_url = $${params.length}`)
  }
  if (sets.length === 0) return false
  params.push(token)
  const rows = await query<{ id: string }>(
    `UPDATE curated_businesses SET ${sets.join(', ')} WHERE dashboard_token = $${params.length} RETURNING id`,
    params
  )
  return rows.length > 0
}

export async function listAllCurated(): Promise<Business[]> {
  if (!isDatabaseConfigured()) return []
  const rows = await query<CuratedRow>(
    'SELECT * FROM curated_businesses ORDER BY created_at DESC'
  )
  return rows.map(rowToBusiness)
}

export async function addCuratedFromYelp(
  business: Business,
  category: string,
  cities: string[],
  trialEndsAt?: string | null
): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  const normalizedCities = [...new Set(cities.map(normalizeCity).filter(Boolean))]
  if (normalizedCities.length === 0) throw new Error('At least one city is required')
  await query(
    `INSERT INTO curated_businesses (
       yelp_id, source, category, cities, name, phone, address, image_url, website_url,
       rating, review_count, categories, trial_ends_at, is_trial
     ) VALUES ($1,'yelp',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (yelp_id) DO UPDATE SET
       source = EXCLUDED.source,
       category = EXCLUDED.category,
       cities = EXCLUDED.cities,
       name = EXCLUDED.name,
       phone = EXCLUDED.phone,
       address = EXCLUDED.address,
       image_url = EXCLUDED.image_url,
       website_url = EXCLUDED.website_url,
       rating = EXCLUDED.rating,
       review_count = EXCLUDED.review_count,
       categories = EXCLUDED.categories,
       trial_ends_at = EXCLUDED.trial_ends_at,
       is_trial = EXCLUDED.is_trial`,
    [
      business.id,
      category,
      normalizedCities,
      business.name,
      business.phone || null,
      business.address || null,
      business.imageUrl || null,
      business.websiteUrl || null,
      business.rating,
      business.reviewCount,
      business.categories,
      trialEndsAt ?? null,
      trialEndsAt !== undefined,
    ]
  )
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
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  const cities = input.cities.map(normalizeCity).filter(Boolean)
  if (cities.length === 0) throw new Error('At least one city is required')
  await query(
    `INSERT INTO curated_businesses (
       source, category, cities, name, phone, address, image_url, website_url, review_url,
       categories, trial_ends_at, is_trial
     ) VALUES ('manual',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      input.category,
      cities,
      input.name,
      input.phone || null,
      input.address || null,
      input.imageUrl || null,
      input.websiteUrl || null,
      input.reviewUrl || null,
      input.categories ?? [],
      input.trialEndsAt ?? null,
      input.trialEndsAt !== undefined,
    ]
  )
}

export async function updateCuratedManual(id: string, input: Partial<ManualBusinessInput>): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  const sets: string[] = []
  const params: unknown[] = []
  const set = (column: string, value: unknown) => {
    params.push(value)
    sets.push(`${column} = $${params.length}`)
  }
  if (input.name !== undefined) set('name', input.name)
  if (input.phone !== undefined) set('phone', input.phone || null)
  if (input.address !== undefined) set('address', input.address || null)
  if (input.websiteUrl !== undefined) set('website_url', input.websiteUrl || null)
  if (input.reviewUrl !== undefined) set('review_url', input.reviewUrl || null)
  if (input.imageUrl !== undefined) set('image_url', input.imageUrl || null)
  if (input.category !== undefined) set('category', input.category)
  if (input.cities !== undefined) set('cities', input.cities.map(normalizeCity).filter(Boolean))
  if (input.categories !== undefined) set('categories', input.categories)
  if (sets.length === 0) return
  params.push(id)
  await query(
    `UPDATE curated_businesses SET ${sets.join(', ')} WHERE id = $${params.length}`,
    params
  )
}

export async function updateCuratedCities(id: string, cities: string[]): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  const normalized = cities.map(normalizeCity).filter(Boolean)
  if (normalized.length === 0) throw new Error('At least one city is required')
  await query('UPDATE curated_businesses SET cities = $1 WHERE id = $2', [normalized, id])
}

export async function removeCurated(id: string): Promise<void> {
  if (!isDatabaseConfigured()) return
  await query(
    'UPDATE enrollment_invitations SET curated_business_id = NULL WHERE curated_business_id = $1',
    [id]
  )
  await query('DELETE FROM curated_businesses WHERE id = $1', [id])
}

export async function updateProSiteEnabled(id: string, enabled: boolean): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query('UPDATE curated_businesses SET pro_site_enabled = $1 WHERE id = $2', [enabled, id])
}

/**
 * Hide (or restore) a curated business without deleting its row — used when
 * a subscription is canceled/expired via the Stripe webhook. Hidden rows are
 * filtered out of `getCurated`, mirroring the `trial_ends_at` pattern, but
 * remain in `listAllCurated` for admin visibility/audit history.
 */
export async function setCuratedDelisted(id: string, delisted: boolean): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query('UPDATE curated_businesses SET delisted_at = $1 WHERE id = $2', [
    delisted ? new Date().toISOString() : null,
    id,
  ])
}

/**
 * Store the contact email captured from Stripe Checkout's
 * `customer_details.email` on a curated business — the address dunning
 * notices (e.g. on `invoice.payment_failed`) are sent to. No-ops when
 * the database isn't configured or `email` is falsy, matching the webhook's
 * fire-and-forget-on-missing-data handling of this optional field.
 */
export async function setCuratedContactEmail(id: string, email: string): Promise<void> {
  if (!isDatabaseConfigured() || !email) return
  await query('UPDATE curated_businesses SET contact_email = $1 WHERE id = $2', [email, id])
}

/**
 * Bump a single integer counter column on a `curated_businesses` row by 1.
 * The update is atomic. A missing row or a missing database configuration
 * is a no-op, matching the fire-and-forget call sites (page render,
 * click-tracking endpoint) that should never fail a request over a missed
 * counter increment.
 */
async function incrementCounterColumn(id: string, column: string): Promise<void> {
  if (!isDatabaseConfigured()) return
  if (!COUNTER_COLUMNS.has(column)) throw new Error('Unknown counter')
  await query(
    `UPDATE curated_businesses SET ${column} = COALESCE(${column}, 0) + 1 WHERE id = $1`,
    [id]
  )
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
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query('UPDATE curated_businesses SET winback_sent_at = $1 WHERE id = $2', [
    new Date().toISOString(),
    id,
  ])
}

export async function findCuratedIdByYelpId(yelpId: string): Promise<string | null> {
  if (!isDatabaseConfigured()) return null
  const rows = await query<{ id: string }>(
    'SELECT id FROM curated_businesses WHERE yelp_id = $1',
    [yelpId]
  )
  return rows[0]?.id ?? null
}

export async function findLatestManualCuratedId(name: string): Promise<string | null> {
  if (!isDatabaseConfigured()) return null
  const rows = await query<{ id: string }>(
    `SELECT id FROM curated_businesses
     WHERE name = $1 AND source = 'manual'
     ORDER BY created_at DESC
     LIMIT 1`,
    [name]
  )
  return rows[0]?.id ?? null
}

export async function setCuratedTrial(
  id: string,
  trialEndsAt: string | null,
  cities: string[]
): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  await query(
    'UPDATE curated_businesses SET is_trial = TRUE, trial_ends_at = $1, cities = $2 WHERE id = $3',
    [trialEndsAt, cities, id]
  )
}

export async function uploadBusinessPhoto(
  file: ArrayBuffer,
  contentType: string,
  filename: string
): Promise<string> {
  if (!isStorageConfigured()) throw new Error('Storage not configured')
  const ext = filename.split('.').pop() ?? 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  return uploadPublicObject(new Uint8Array(file), contentType, path)
}
