import { randomBytes } from 'node:crypto'
import { isDatabaseConfigured, query } from './db'
import { normalizeEmail } from './suppressions'
import { createUnsubscribeToken } from './unsubscribe'

/** 16 bytes = 128 bits. base64url of that is 22 characters with no padding. */
export const PREVIEW_TOKEN_BYTES = 16
const PREVIEW_TOKEN_RE = /^[A-Za-z0-9_-]{22}$/
const REF_RE = /^[A-Za-z0-9._~-]{1,64}$/
const PRODUCTION_PREVIEW_HOSTS = new Set(['quickprolist.com', 'www.quickprolist.com'])

const SCANNER_UA =
  /bot\b|spider|crawler|slurp|facebookexternalhit|slackbot|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|pinterest|embedly|qwantify|duckduckbot|baiduspider|yandex|semrush|ahrefs|petalbot|curl\/|wget|python-requests|go-http-client|libwww|previewbot|linkchecker/i

export const DEFAULT_PREVIEW_TTL_DAYS = 60

export interface PreviewTokenRecord {
  token: string
  prospectId: string | null
  curatedBusinessId: string | null
  invitationToken: string | null
  recipientEmail: string
  campaignId: string | null
  createdAt: string
  expiresAt: string | null
  firstViewedAt: string | null
  lastViewedAt: string | null
  viewCount: number
  lastRef: string | null
  lastUserAgent: string | null
  optedOutAt: string | null
}

interface PreviewTokenRow {
  token: string
  prospect_id: string | null
  curated_business_id: string | null
  invitation_token: string | null
  recipient_email: string
  campaign_id: string | null
  created_at: string
  expires_at: string | null
  first_viewed_at: string | null
  last_viewed_at: string | null
  view_count: number
  last_ref: string | null
  last_user_agent: string | null
  opted_out_at: string | null
}

export interface PreviewProspectSummary {
  token: string
  path: string
  viewCount: number
  firstViewedAt: string | null
  lastViewedAt: string | null
  lastRef: string | null
}

function rowToRecord(row: PreviewTokenRow): PreviewTokenRecord {
  return {
    token: row.token,
    prospectId: row.prospect_id,
    curatedBusinessId: row.curated_business_id,
    invitationToken: row.invitation_token,
    recipientEmail: row.recipient_email,
    campaignId: row.campaign_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    firstViewedAt: row.first_viewed_at,
    lastViewedAt: row.last_viewed_at,
    viewCount: row.view_count,
    lastRef: row.last_ref,
    lastUserAgent: row.last_user_agent,
    optedOutAt: row.opted_out_at,
  }
}

export function generatePreviewToken(): string {
  return randomBytes(PREVIEW_TOKEN_BYTES).toString('base64url')
}

/** Accept only the 128-bit token shape. UUIDs and other junk never reach SQL. */
export function isPreviewTokenFormat(token: string): boolean {
  return PREVIEW_TOKEN_RE.test(token)
}

export function sanitizePreviewRef(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!REF_RE.test(trimmed)) return null
  return trimmed
}

export function isPreviewExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return false
  const time = new Date(expiresAt).getTime()
  if (Number.isNaN(time)) return true
  return time <= now
}

export function previewExpiresAt(from = new Date()): Date {
  const raw = Number(process.env.PREVIEW_TOKEN_TTL_DAYS)
  const days = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PREVIEW_TTL_DAYS
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
}

/**
 * Skip HEAD and known link-scanner user agents so a mail prefetch does not
 * count as the contractor opening the page.
 */
export function shouldCountPreviewView(input: {
  userAgent?: string | null
  purpose?: string | null
  method?: string | null
}): boolean {
  if ((input.method ?? 'GET').toUpperCase() === 'HEAD') return false
  const purpose = input.purpose?.toLowerCase() ?? ''
  if (purpose.includes('prefetch') || purpose === 'preview') return false
  const ua = input.userAgent ?? ''
  if (ua && SCANNER_UA.test(ua)) return false
  return true
}

export function assertDevPreviewBaseUrl(base: string): string {
  const url = new URL(base)
  const host = url.hostname.toLowerCase()
  if (PRODUCTION_PREVIEW_HOSTS.has(host)) {
    throw new Error('Refusing to mint a production preview URL')
  }
  return base.replace(/\/$/, '')
}

export function previewUrlForToken(baseUrl: string, token: string): string {
  return `${assertDevPreviewBaseUrl(baseUrl)}/preview/${token}`
}

export function fillPreviewUrlPlaceholder(template: string, previewUrl: string): string {
  return template.replaceAll('{previewUrl}', previewUrl)
}

/** One distinct token per recipient. Does not write to the database. */
export function mintDistinctPreviewTokens(emails: string[]): Map<string, string> {
  const issued = new Set<string>()
  const map = new Map<string, string>()
  for (const email of emails) {
    let token = generatePreviewToken()
    while (issued.has(token)) token = generatePreviewToken()
    issued.add(token)
    map.set(email, token)
  }
  return map
}

export async function createPreviewToken(input: {
  recipientEmail: string
  prospectId?: string | null
  curatedBusinessId?: string | null
  invitationToken?: string | null
  campaignId?: string | null
  expiresAt?: Date | null
}): Promise<string> {
  if (!isDatabaseConfigured()) throw new Error('Database not configured')
  const email = normalizeEmail(input.recipientEmail)
  if (!email.includes('@')) throw new Error('recipient email is required')
  const token = generatePreviewToken()
  const expiresAt = input.expiresAt === undefined ? previewExpiresAt() : input.expiresAt
  await query(
    `INSERT INTO preview_tokens (
       token, prospect_id, curated_business_id, invitation_token, recipient_email,
       campaign_id, expires_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      token,
      input.prospectId ?? null,
      input.curatedBusinessId ?? null,
      input.invitationToken ?? null,
      email,
      input.campaignId ?? null,
      expiresAt ? expiresAt.toISOString() : null,
    ]
  )
  return token
}

/**
 * Read a token that can still be shown. Unknown, expired, and opted-out
 * tokens return null so the route can 404 without saying which case it was.
 */
export async function getActivePreview(token: string, now = new Date()): Promise<PreviewTokenRecord | null> {
  if (!isPreviewTokenFormat(token)) return null
  if (!isDatabaseConfigured()) return null
  const rows = await query<PreviewTokenRow>(
    'SELECT * FROM preview_tokens WHERE token = $1',
    [token]
  )
  const row = rows[0]
  if (!row) return null
  if (row.opted_out_at) return null
  if (isPreviewExpired(row.expires_at, now.getTime())) return null
  return rowToRecord(row)
}

/**
 * Preview-page open counter only. Does not touch profile views, contact
 * clicks, or curated_businesses.
 */
export async function recordPreviewView(
  token: string,
  opts: { ref: string | null; userAgent?: string | null }
): Promise<void> {
  if (!isPreviewTokenFormat(token)) return
  if (!isDatabaseConfigured()) return
  const ref = sanitizePreviewRef(opts.ref)
  const userAgent = opts.userAgent?.trim().slice(0, 300) || null
  await query(
    `UPDATE preview_tokens
     SET first_viewed_at = COALESCE(first_viewed_at, NOW()),
         last_viewed_at = NOW(),
         view_count = view_count + 1,
         last_ref = COALESCE($2, last_ref),
         last_user_agent = $3
     WHERE token = $1
       AND opted_out_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [token, ref, userAgent]
  )
}

export async function markPreviewOptedOut(token: string, email: string): Promise<boolean> {
  if (!isPreviewTokenFormat(token)) return false
  if (!isDatabaseConfigured()) return false
  const rows = await query<{ token: string }>(
    `UPDATE preview_tokens
     SET opted_out_at = COALESCE(opted_out_at, NOW())
     WHERE token = $1
       AND lower(trim(recipient_email)) = $2
     RETURNING token`,
    [token, normalizeEmail(email)]
  )
  return rows.length > 0
}

/** Same-host confirm link. GET shows the existing unsubscribe confirmation. */
export function buildPreviewOptOutHref(email: string, previewToken: string): string | null {
  if (!isPreviewTokenFormat(previewToken)) return null
  try {
    const token = createUnsubscribeToken(email)
    const params = new URLSearchParams({ token, preview: previewToken })
    return `/api/unsubscribe?${params.toString()}`
  } catch {
    return null
  }
}

export async function listLatestPreviewByProspect(
  prospectIds: string[]
): Promise<Map<string, PreviewProspectSummary>> {
  const map = new Map<string, PreviewProspectSummary>()
  if (!prospectIds.length || !isDatabaseConfigured()) return map
  const rows = await query<{
    prospect_id: string
    token: string
    view_count: number
    first_viewed_at: string | null
    last_viewed_at: string | null
    last_ref: string | null
  }>(
    `SELECT DISTINCT ON (prospect_id)
       prospect_id, token, view_count, first_viewed_at, last_viewed_at, last_ref
     FROM preview_tokens
     WHERE prospect_id = ANY($1::uuid[])
     ORDER BY prospect_id, created_at DESC`,
    [prospectIds]
  )
  for (const row of rows) {
    map.set(row.prospect_id, {
      token: row.token,
      path: `/preview/${row.token}`,
      viewCount: row.view_count,
      firstViewedAt: row.first_viewed_at,
      lastViewedAt: row.last_viewed_at,
      lastRef: row.last_ref,
    })
  }
  return map
}
