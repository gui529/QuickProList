import { createClient } from '@supabase/supabase-js'

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

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * Persist a "List your business" form submission. Returns null (instead of
 * throwing) when Supabase isn't configured, so callers can treat storage as
 * a soft dependency rather than failing the whole request.
 */
export async function createListingRequest(input: ListingRequestInput): Promise<ListingRequest | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('business_listing_requests')
    .insert({
      business_name: input.businessName,
      contact_name: input.contactName,
      email: input.email,
      phone: input.phone ?? null,
      category: input.category,
      zip: input.zip,
      message: input.message ?? null,
    })
    .select('*')
    .single()

  if (error || !data) throw new Error('Failed to record listing request')
  return data as ListingRequest
}
