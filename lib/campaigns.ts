import { isDatabaseConfigured, query } from './db'

export { expandCampaignMessage, type CampaignMessageContext } from './campaign-message'

/** Placeholders expanded on send: {senderIntro}, {businessName}, {city}, {category}, {areas}, {siteUrl}, {signature} */
/** Cold outreach — business not yet on the site (Wave 2 / third slot). One preview link, added below the body. */
export const DEFAULT_MESSAGE = `Homeowners around {areas} look for a local pro when a job comes up, and {businessName} is not on that list yet.

{senderIntro}. Would it be okay if I added {businessName} for 30 days so people searching there can find you?

The link below is the preview for {businessName}.

{signature}`

/** Listed pros already visible in search (Wave 1). One preview link, added below the body. */
export const LISTED_MESSAGE = `{businessName} already shows up when homeowners around {areas} look for {category} pros.

{senderIntro}. There is no charge for being listed today. Claim the spot with a 30-day preview and see what we would publish before you decide whether to stay.

The link below is the preview for {businessName}.

{signature}`

export interface CampaignContact {
  id: string
  yelp_id: string | null
  business_name: string
  phone: string
  email: string | null
  channel: 'sms' | 'email'
  category: string | null
  city: string | null
  message_body: string
  message_sid: string | null
  status: 'sent' | 'failed'
  error_message: string | null
  invitation_token: string | null
  website: string | null
  logo_url: string | null
  pro_response: 'yes' | 'no' | null
  pro_response_at: string | null
  sent_at: string
}

export type CampaignProResponse = 'yes' | 'no'

export interface RecordContactInput {
  yelpId?: string
  businessName: string
  phone?: string
  email?: string
  channel: 'sms' | 'email'
  category?: string
  city?: string
  messageBody: string
  messageSid?: string
  status: 'sent' | 'failed'
  errorMessage?: string
  invitationToken?: string
  website?: string
  logoUrl?: string
}

export async function recordContact(input: RecordContactInput): Promise<CampaignContact> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  const rows = await query<CampaignContact>(
    `INSERT INTO campaign_contacts (
       yelp_id, business_name, phone, email, channel, category, city, message_body,
       message_sid, status, error_message, invitation_token, website, logo_url
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      input.yelpId ?? null,
      input.businessName,
      input.phone ?? '',
      input.email ?? null,
      input.channel,
      input.category ?? null,
      input.city ?? null,
      input.messageBody,
      input.messageSid ?? null,
      input.status,
      input.errorMessage ?? null,
      input.invitationToken ?? null,
      input.website?.trim() || null,
      input.logoUrl?.trim() || null,
    ]
  )
  if (!rows[0]) throw new Error('Failed to record campaign contact')
  return rows[0]
}

export async function listCampaignContacts(): Promise<CampaignContact[]> {
  if (!isDatabaseConfigured()) return []
  return query<CampaignContact>(
    'SELECT * FROM campaign_contacts ORDER BY sent_at DESC'
  )
}

export async function setCampaignContactProResponse(
  id: string,
  response: CampaignProResponse | null
): Promise<CampaignContact | null> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  const rows = await query<CampaignContact>(
    `UPDATE campaign_contacts
     SET pro_response = $2,
         pro_response_at = CASE WHEN $2 IS NULL THEN NULL ELSE NOW() END
     WHERE id = $1
     RETURNING *`,
    [id, response]
  )
  return rows[0] ?? null
}
