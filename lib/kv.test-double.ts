// Test-only in-memory double for lib/kv.ts.
//
// Mirrors the exported function signatures of lib/kv.ts, backed by a plain
// in-memory array instead of Supabase. This lets other backlog items
// (webhook logic, invitation expiry, multi-city fixes, etc.) unit-test
// curation behavior without live Supabase credentials.
//
// IMPORTANT: this is a test double only. Never import it from `app/` or
// from non-test files under `lib/` — see BACKLOG.md QPL-001.
import type { Business } from './yelp'
import type { ManualBusinessInput } from './kv'

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
  created_at: string
}

let rows: CuratedRow[] = []
let idCounter = 0

/** Test-only helper: clear all in-memory state between tests. */
export function __reset(): void {
  rows = []
  idCounter = 0
}

/** Test-only helper: seed a curated row directly, bypassing the add* helpers. */
export function __seed(row: Partial<CuratedRow> = {}): CuratedRow {
  const full: CuratedRow = {
    id: row.id ?? `curated-${++idCounter}`,
    yelp_id: row.yelp_id ?? null,
    source: row.source ?? 'manual',
    category: row.category ?? 'general',
    cities: row.cities ?? [],
    name: row.name ?? 'Test Business',
    phone: row.phone ?? null,
    address: row.address ?? null,
    image_url: row.image_url ?? null,
    website_url: row.website_url ?? null,
    rating: row.rating ?? null,
    review_count: row.review_count ?? null,
    categories: row.categories ?? null,
    trial_ends_at: row.trial_ends_at ?? null,
    is_trial: row.is_trial ?? false,
    pro_site_enabled: row.pro_site_enabled ?? false,
    created_at: row.created_at ?? new Date().toISOString(),
  }
  rows.push(full)
  return full
}

/** Test-only helper: inspect all rows currently in the store. */
export function __all(): CuratedRow[] {
  return [...rows]
}

function rowToBusiness(row: CuratedRow): Business {
  const isYelp = row.source === 'yelp'
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
  const now = Date.now()
  return rows
    .filter(
      (r) =>
        r.category === category &&
        r.cities.includes(normalizeCity(city)) &&
        (!r.trial_ends_at || new Date(r.trial_ends_at).getTime() > now)
    )
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(rowToBusiness)
}

export async function getCuratedById(id: string): Promise<Business | null> {
  const row = rows.find((r) => r.id === id)
  return row ? rowToBusiness(row) : null
}

export async function listAllCurated(): Promise<Business[]> {
  return [...rows]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(rowToBusiness)
}

export async function addCuratedFromYelp(
  business: Business,
  category: string,
  city: string,
  trialEndsAt?: string | null
): Promise<void> {
  const existingIdx = rows.findIndex((r) => r.yelp_id === business.id)
  const base = existingIdx >= 0 ? rows[existingIdx] : undefined
  const row: CuratedRow = {
    id: base?.id ?? `curated-${++idCounter}`,
    yelp_id: business.id,
    source: 'yelp',
    category,
    cities: [normalizeCity(city)],
    name: business.name,
    phone: business.phone || null,
    address: business.address || null,
    image_url: business.imageUrl || null,
    website_url: business.websiteUrl || null,
    rating: business.rating,
    review_count: business.reviewCount,
    categories: business.categories ?? null,
    trial_ends_at: trialEndsAt ?? null,
    is_trial: trialEndsAt !== undefined,
    pro_site_enabled: base?.pro_site_enabled ?? false,
    created_at: base?.created_at ?? new Date().toISOString(),
  }
  if (existingIdx >= 0) rows[existingIdx] = row
  else rows.push(row)
}

export async function addCuratedManual(input: ManualBusinessInput): Promise<void> {
  const cities = input.cities.map(normalizeCity).filter(Boolean)
  if (cities.length === 0) throw new Error('At least one city is required')
  rows.push({
    id: `curated-${++idCounter}`,
    yelp_id: null,
    source: 'manual',
    category: input.category,
    cities,
    name: input.name,
    phone: input.phone || null,
    address: input.address || null,
    image_url: input.imageUrl || null,
    website_url: input.websiteUrl || null,
    rating: null,
    review_count: null,
    categories: input.categories ?? [],
    trial_ends_at: input.trialEndsAt ?? null,
    is_trial: input.trialEndsAt !== undefined,
    pro_site_enabled: false,
    created_at: new Date().toISOString(),
  })
}

export async function updateCuratedManual(id: string, input: Partial<ManualBusinessInput>): Promise<void> {
  const row = rows.find((r) => r.id === id)
  if (!row) throw new Error('Not found')
  if (input.name !== undefined) row.name = input.name
  if (input.phone !== undefined) row.phone = input.phone || null
  if (input.address !== undefined) row.address = input.address || null
  if (input.websiteUrl !== undefined) row.website_url = input.websiteUrl || null
  if (input.imageUrl !== undefined) row.image_url = input.imageUrl || null
  if (input.category !== undefined) row.category = input.category
  if (input.cities !== undefined) row.cities = input.cities.map(normalizeCity).filter(Boolean)
  if (input.categories !== undefined) row.categories = input.categories
}

export async function updateCuratedCities(id: string, cities: string[]): Promise<void> {
  const normalized = cities.map(normalizeCity).filter(Boolean)
  if (normalized.length === 0) throw new Error('At least one city is required')
  const row = rows.find((r) => r.id === id)
  if (!row) throw new Error('Not found')
  row.cities = normalized
}

export async function removeCurated(id: string): Promise<void> {
  rows = rows.filter((r) => r.id !== id)
}

export async function updateProSiteEnabled(id: string, enabled: boolean): Promise<void> {
  const row = rows.find((r) => r.id === id)
  if (!row) throw new Error('Not found')
  row.pro_site_enabled = enabled
}

export async function uploadBusinessPhoto(
  _file: ArrayBuffer,
  _contentType: string,
  filename: string
): Promise<string> {
  const ext = filename.split('.').pop() ?? 'jpg'
  return `https://example.test/business-photos/${++idCounter}.${ext}`
}
