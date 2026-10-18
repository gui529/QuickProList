import type { Business } from './business'
import type { CampaignProspectClient } from './campaign-prospects'
import { getCampaignProspect } from './campaign-prospects'
import { isDatabaseConfigured, query } from './db'
import { formatCategoryLabel, formatCityLabel } from './display'
import { listingFieldsFromInvitation } from './invitation-listing'
import { getInvitationByToken, type EnrollmentInvitation } from './invitations'
import { getCuratedById } from './kv'
import { toPublicBusiness } from './public-business'
import type { PreviewTokenRecord } from './preview-tokens'

export const EXISTING_LISTING_NOTE =
  'QuickProList already has a listing for this business. This preview did not create a second one.'

export interface ListingMatch {
  id: string
  name: string
}

export interface PreviewListing {
  business: Business
  existingListingNote: boolean
  matchedListingIds: string[]
}

export function businessFromProspect(
  prospect: Pick<
    CampaignProspectClient,
    'id' | 'businessName' | 'phone' | 'website' | 'logoUrl' | 'category' | 'city'
  >
): Business {
  const city = formatCityLabel(prospect.city)
  const categoryLabel = formatCategoryLabel(prospect.category)
  const website = prospect.website?.trim()
  return {
    id: `preview-prospect:${prospect.id}`,
    source: 'manual',
    name: prospect.businessName,
    rating: null,
    reviewCount: null,
    phone: prospect.phone ?? '',
    address: '',
    imageUrl: prospect.logoUrl ?? '',
    url: '',
    websiteUrl: website || undefined,
    categories: categoryLabel ? [categoryLabel] : [],
    cities: city ? [city] : [],
    category: prospect.category,
  }
}

/** Listing card for a preview token that only stored an invitation. */
export function businessFromInvitation(invitation: EnrollmentInvitation): Business {
  const fields = listingFieldsFromInvitation(invitation)
  const cities = (invitation.cities ?? []).map((city) => formatCityLabel(city)).filter(Boolean)
  const categoryLabel = formatCategoryLabel(invitation.category)
  const website = fields.websiteUrl?.trim()
  return {
    id: `preview-invitation:${invitation.token}`,
    source: 'manual',
    name: invitation.business_name,
    rating: null,
    reviewCount: null,
    phone: fields.phone ?? '',
    address: fields.address ?? '',
    imageUrl: fields.imageUrl ?? '',
    url: '',
    websiteUrl: website || undefined,
    categories: categoryLabel ? [categoryLabel] : [],
    cities,
    category: invitation.category,
  }
}

/** Digits used for a cheap phone match. Empty when the value is not a US number. */
export function listingPhoneDigits(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  return ''
}

/**
 * Read-only lookup for a curated row with the same email, phone, or
 * name + city. Never inserts.
 */
export async function findExistingListingMatches(input: {
  name?: string | null
  email?: string | null
  phone?: string | null
  city?: string | null
}): Promise<ListingMatch[]> {
  if (!isDatabaseConfigured()) return []
  const email = input.email?.trim().toLowerCase() ?? ''
  const phone = listingPhoneDigits(input.phone)
  const name = input.name?.trim().toLowerCase() ?? ''
  const city = input.city?.trim().toLowerCase().split(',')[0]?.trim() ?? ''
  if (!email && !phone && !(name && city)) return []

  return query<ListingMatch>(
    `SELECT id, name
     FROM curated_businesses
     WHERE delisted_at IS NULL
       AND (
         ($1::text <> '' AND lower(trim(contact_email)) = $1)
         OR (
           $2::text <> ''
           AND right(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'), 10) = $2
         )
         OR (
           $3::text <> '' AND $4::text <> ''
           AND lower(trim(name)) = $3
           AND EXISTS (
             SELECT 1 FROM unnest(cities) AS city
             WHERE lower(trim(split_part(city, ',', 1))) = $4
           )
         )
       )
     LIMIT 5`,
    [email, phone, name, city]
  )
}

/**
 * Listing data for a preview. Reads curated or prospect rows and does not
 * publish, insert, or update a public listing.
 */
async function listingFromCurated(curated: Business, recipientEmail: string): Promise<PreviewListing> {
  const found = await findExistingListingMatches({
    name: curated.name,
    email: recipientEmail,
    phone: curated.phone,
    city: curated.cities?.[0] ?? curated.address,
  })
  const others = found.filter((match) => match.id !== curated.id)
  return {
    business: toPublicBusiness(curated),
    existingListingNote: others.length > 0,
    matchedListingIds: found.map((match) => match.id),
  }
}

async function listingFromInvitation(
  invitation: EnrollmentInvitation,
  recipientEmail: string
): Promise<PreviewListing> {
  if (invitation.curated_business_id) {
    const curated = await getCuratedById(invitation.curated_business_id)
    if (curated) return listingFromCurated(curated, recipientEmail)
  }
  const fields = listingFieldsFromInvitation(invitation)
  const business = businessFromInvitation(invitation)
  const found = await findExistingListingMatches({
    name: invitation.business_name,
    email: invitation.contact_email ?? recipientEmail,
    phone: fields.phone,
    city: invitation.cities?.[0],
  })
  return {
    business,
    existingListingNote: found.length > 0,
    matchedListingIds: found.map((match) => match.id),
  }
}

export async function loadPreviewListing(record: PreviewTokenRecord): Promise<PreviewListing | null> {
  if (record.curatedBusinessId) {
    const curated = await getCuratedById(record.curatedBusinessId)
    if (curated) return listingFromCurated(curated, record.recipientEmail)
  }

  if (record.prospectId) {
    const prospect = await getCampaignProspect(record.prospectId)
    if (!prospect) return null
    const business = businessFromProspect(prospect)
    const found = await findExistingListingMatches({
      name: prospect.businessName,
      email: prospect.email,
      phone: prospect.phone,
      city: prospect.city,
    })
    return {
      business,
      existingListingNote: found.length > 0,
      matchedListingIds: found.map((match) => match.id),
    }
  }

  const invitationToken = record.invitationToken?.trim() ?? ''
  if (invitationToken) {
    const invitation = await getInvitationByToken(invitationToken)
    if (!invitation) return null
    return listingFromInvitation(invitation, record.recipientEmail)
  }

  return null
}
