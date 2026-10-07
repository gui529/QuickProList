import { isDatabaseConfigured, query } from './db'

export interface ListingRequestInput {
  businessName: string
  contactName: string
  email: string
  phone?: string
  category: string
  zip: string
  message?: string
}

export interface ListingRequest {
  id: string
  business_name: string
  contact_name: string
  email: string
  phone: string | null
  category: string
  zip: string
  message: string | null
  created_at: string
}

/**
 * Persist a "List your business" form submission. Returns null (instead of
 * throwing) when the database isn't configured, so callers can treat storage as
 * a soft dependency rather than failing the whole request.
 */
export async function createListingRequest(input: ListingRequestInput): Promise<ListingRequest | null> {
  if (!isDatabaseConfigured()) return null

  const rows = await query<ListingRequest>(
    `INSERT INTO business_listing_requests (
       business_name, contact_name, email, phone, category, zip, message
     ) VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      input.businessName,
      input.contactName,
      input.email,
      input.phone ?? null,
      input.category,
      input.zip,
      input.message ?? null,
    ]
  )
  if (!rows[0]) throw new Error('Failed to record listing request')
  return rows[0]
}

/**
 * List all "List your business" submissions, most recent first, for the
 * admin inbox. Returns an empty array (instead of throwing) when the database
 * isn't configured, matching the soft-dependency pattern used elsewhere.
 */
export async function listListingRequests(): Promise<ListingRequest[]> {
  if (!isDatabaseConfigured()) return []
  return query<ListingRequest>(
    'SELECT * FROM business_listing_requests ORDER BY created_at DESC'
  )
}
