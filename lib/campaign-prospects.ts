import { isDatabaseConfigured, query } from './db'

export type CampaignProspectStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'failed'

export interface CampaignProspect {
  id: string
  business_name: string
  email: string
  phone: string | null
  website: string | null
  category: string
  city: string
  status: CampaignProspectStatus
  discovery_notes: string | null
  search_query: string | null
  error_message: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface AddCampaignProspectInput {
  businessName: string
  email: string
  phone?: string
  website?: string
  category: string
  city: string
  discoveryNotes?: string
  searchQuery?: string
}

function rowToClient(row: CampaignProspect) {
  return {
    id: row.id,
    businessName: row.business_name,
    email: row.email,
    phone: row.phone,
    website: row.website,
    category: row.category,
    city: row.city,
    status: row.status,
    discoveryNotes: row.discovery_notes,
    searchQuery: row.search_query,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type CampaignProspectClient = ReturnType<typeof rowToClient>

export async function listCampaignProspects(
  status?: CampaignProspectStatus
): Promise<CampaignProspectClient[]> {
  if (!isDatabaseConfigured()) return []
  const rows = status
    ? await query<CampaignProspect>(
        `SELECT * FROM campaign_prospects WHERE status = $1 ORDER BY created_at DESC`,
        [status]
      )
    : await query<CampaignProspect>(
        `SELECT * FROM campaign_prospects
         WHERE status <> 'rejected'
         ORDER BY created_at DESC`
      )
  return rows.map(rowToClient)
}

export async function getCampaignProspect(id: string): Promise<CampaignProspectClient | null> {
  if (!isDatabaseConfigured()) return null
  const rows = await query<CampaignProspect>(`SELECT * FROM campaign_prospects WHERE id = $1`, [id])
  return rows[0] ? rowToClient(rows[0]) : null
}

/** Insert from discovery worker; skips duplicate active emails. */
export async function addCampaignProspectFromDiscovery(
  input: AddCampaignProspectInput
): Promise<{ prospect: CampaignProspectClient | null; skipped: boolean }> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')

  const email = input.email.trim().toLowerCase()
  const businessName = input.businessName.trim()
  if (!email.includes('@') || !businessName) {
    return { prospect: null, skipped: true }
  }

  try {
    const rows = await query<CampaignProspect>(
      `INSERT INTO campaign_prospects (
         business_name, email, phone, website, category, city,
         discovery_notes, search_query, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_review')
       RETURNING *`,
      [
        businessName,
        email,
        input.phone?.trim() || null,
        input.website?.trim() || null,
        input.category.trim(),
        input.city.trim(),
        input.discoveryNotes?.trim() || null,
        input.searchQuery?.trim() || null,
      ]
    )
    return { prospect: rows[0] ? rowToClient(rows[0]) : null, skipped: false }
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : ''
    if (code === '23505') return { prospect: null, skipped: true }
    throw err
  }
}

export async function setCampaignProspectStatus(
  id: string,
  status: CampaignProspectStatus,
  extra?: { errorMessage?: string }
): Promise<CampaignProspectClient | null> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  const sentAt = status === 'sent' ? new Date().toISOString() : null
  const clearError = status === 'approved' || status === 'sent'
  const errorMessage =
    extra?.errorMessage !== undefined
      ? extra.errorMessage
      : clearError
        ? null
        : undefined
  const rows = await query<CampaignProspect>(
    `UPDATE campaign_prospects
     SET status = $2,
         error_message = CASE
           WHEN $3::text IS NOT NULL THEN $3
           WHEN $5 THEN NULL
           ELSE error_message
         END,
         sent_at = COALESCE($4, sent_at),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, errorMessage ?? null, sentAt, clearError && extra?.errorMessage === undefined]
  )
  return rows[0] ? rowToClient(rows[0]) : null
}
