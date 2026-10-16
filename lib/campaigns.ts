import { isDatabaseConfigured, query } from './db'

export { expandCampaignMessage, type CampaignMessageContext } from './campaign-message'

/** Placeholders expanded on send: {senderIntro}, {businessName}, {city}, {category}, {areas}, {siteUrl}, {signature} */
/** Cold outreach — business not yet on the site (Wave 2 / third slot). */
export const DEFAULT_MESSAGE = `{senderIntro} — a simple local list website where homeowners search for pros around {areas}. I'm reaching out to you directly because I'd love to add {businessName} to that list.

If you have not seen us yet, check us out at {siteUrl} — pick a town and trade to browse the way a homeowner would.

Would it be okay if I added your company there for 30 days? A little extra visibility can help you get more jobs.

A quick "yes" or "no" by reply is totally fine. There is also a preview link below for what we would publish for {businessName}.

{signature}`

/** Listed pros already visible in search (Wave 1). */
export const LISTED_MESSAGE = `{senderIntro} — a simple local list where homeowners search for {category} pros around {areas}.

We already show {businessName} when someone searches in {city} (no charge for being listed today). I'm reaching out because we're inviting listed businesses to claim their spot with a 30-day preview — extra visibility while we finish launching the site.

If you have not looked yet, here's the same search a homeowner would use:
{searchUrl}

A quick reply works, or use the link below to preview what we'd publish for {businessName}.

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
