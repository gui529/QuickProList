/**
 * Campaign outreach defaults — automation should not need env for these.
 * Override via env only for local tests.
 */

import { formatSubscriptionPrice } from './subscription-terms'

export const DEFAULT_CAMPAIGN_SITE_URL = 'https://www.quickprolist.com'

/**
 * Resend From for transactional / opted-in product mail only (`jeremy@quickprolist.com`).
 * Cold campaign outreach must NOT use this address or Resend.
 * Manual cold-test sender: gui.quickprolist@gmail.com (see docs/campaigns/board.md).
 * Board Status is PAUSED as of 2026-10-17 — do not send cold outreach from automation.
 */
export const DEFAULT_CAMPAIGN_FROM_EMAIL = 'jeremy@quickprolist.com'
export const DEFAULT_CAMPAIGN_SENDER_NAME = 'Jeremy'

/** Scheduled outreach window (America/New_York). No sends before 7:00 or from 20:00 onward. */
export const CAMPAIGN_SEND_TIMEZONE = 'America/New_York'
export const CAMPAIGN_SEND_WINDOW_START_HOUR = 7
export const CAMPAIGN_SEND_WINDOW_END_HOUR = 20
/** Vercel/Cursor cron: every 20m; last tick 19:40 (inside window). */
export const CAMPAIGN_AUTOMATION_CRON = '0,20,40 7-19 * * *'

export function getCampaignSiteUrl(): string {
  const raw = process.env.SITE_URL?.trim() || DEFAULT_CAMPAIGN_SITE_URL
  return raw.replace(/\/$/, '')
}

/** Resend transactional From only. Not the cold-outreach sender. */
export function getCampaignFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_CAMPAIGN_FROM_EMAIL
}

export function getCampaignSenderName(): string {
  return process.env.CAMPAIGN_SENDER_NAME?.trim() || DEFAULT_CAMPAIGN_SENDER_NAME
}

/** Free preview length and the price after it. Preview CTA copy uses these. */
export const CAMPAIGN_TRIAL_DAYS = 30
/** Same amount as formatSubscriptionPrice(). Do not hard-code a second price. */
export const CAMPAIGN_MONTHLY_PRICE_LABEL = formatSubscriptionPrice()

export function previewEnrollCta(): { headline: string; detail: string } {
  return {
    headline: `Start your ${CAMPAIGN_TRIAL_DAYS}-day free preview, no card needed. Then a flat ${CAMPAIGN_MONTHLY_PRICE_LABEL}/month.`,
    detail: 'Not a lead service: homeowners call you directly, no per-lead fees.',
  }
}

/**
 * CAN-SPAM postal line. Empty when unset — callers hide the line.
 * Do not invent an address.
 */
export function getCampaignPostalAddress(): string | null {
  const raw = process.env.CAMPAIGN_POSTAL_ADDRESS?.trim()
  return raw ? raw : null
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
