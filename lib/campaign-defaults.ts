/**
 * Campaign outreach defaults — automation should not need env for these.
 * Override via env only for local tests.
 */

export const DEFAULT_CAMPAIGN_SITE_URL = 'https://www.quickprolist.com'
export const DEFAULT_CAMPAIGN_FROM_EMAIL = 'jeremy@quickprolist.com'
export const DEFAULT_CAMPAIGN_SENDER_NAME = 'Jeremy'

export function getCampaignSiteUrl(): string {
  const raw = process.env.SITE_URL?.trim() || DEFAULT_CAMPAIGN_SITE_URL
  return raw.replace(/\/$/, '')
}

export function getCampaignFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_CAMPAIGN_FROM_EMAIL
}

export function getCampaignSenderName(): string {
  return process.env.CAMPAIGN_SENDER_NAME?.trim() || DEFAULT_CAMPAIGN_SENDER_NAME
}

/** Call once at campaign script startup (before prepare/finalize). */
export function applyCampaignDefaults(): void {
  if (!process.env.SITE_URL?.trim()) {
    process.env.SITE_URL = DEFAULT_CAMPAIGN_SITE_URL
  }
  if (!process.env.CAMPAIGN_SENDER_NAME?.trim()) {
    process.env.CAMPAIGN_SENDER_NAME = DEFAULT_CAMPAIGN_SENDER_NAME
  }
}
