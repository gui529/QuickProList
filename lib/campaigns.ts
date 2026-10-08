import { isDatabaseConfigured, query } from './db'

export const DEFAULT_MESSAGE =
  'Hi — we help homeowners find local home-service pros on QuickProList. If you would like to be listed in your area, I can send details. No obligation.'

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
  sent_at: string
}

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
}

export async function recordContact(input: RecordContactInput): Promise<CampaignContact> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  const rows = await query<CampaignContact>(
    `INSERT INTO campaign_contacts (
       yelp_id, business_name, phone, email, channel, category, city, message_body,
       message_sid, status, error_message, invitation_token
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
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
