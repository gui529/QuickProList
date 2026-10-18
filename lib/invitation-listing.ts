import type { EnrollmentInvitation } from './invitations'

export interface InvitationListingFields {
  /** Null when the source record has no phone. Callers must not invent one. */
  phone: string | null
  address: string | null
  websiteUrl: string | null
  imageUrl: string | null
}

function textField(data: Record<string, unknown> | null, key: string): string {
  const value = data?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Public listing fields saved on an invitation (usually from a campaign
 * prospect). Name, city, and trade live on the invitation columns themselves.
 * Phone is null when the source had none — that empty value is what upstream
 * checks flag. This never fills in a placeholder number.
 */
export function listingFieldsFromInvitation(invitation: EnrollmentInvitation): InvitationListingFields {
  const data = invitation.yelp_data
  const phone = textField(data, 'phone')
  const address = textField(data, 'address')
  const websiteUrl = textField(data, 'websiteUrl') || textField(data, 'website')
  const imageUrl = textField(data, 'imageUrl') || textField(data, 'logoUrl')
  return {
    phone: phone || null,
    address: address || null,
    websiteUrl: websiteUrl || null,
    imageUrl: imageUrl || null,
  }
}
