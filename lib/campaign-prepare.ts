import { resolveMx } from 'node:dns/promises'
import { DEFAULT_MESSAGE, LISTED_MESSAGE } from './campaigns'
import { expandCampaignMessage } from './campaign-message'
import {
  buildMarketingEmailSubject,
  buildPersonalMarketingEmail,
  campaignFooterText,
  campaignPostalAddress,
  usableCampaignPostalAddress,
  type CampaignEmailWave,
} from './email'
import type { SentRegistryEntry } from './campaign-sent-registry'
import { normalizeEmail } from './suppressions'
import { buildUnsubscribeUrl } from './unsubscribe'

export class CampaignPrepareError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CampaignPrepareError'
  }
}

export const RECENT_BOUNCE_WINDOW = 20
export const MAX_RECENT_BOUNCE_RATE = 0.05

export type CampaignDeliveryStatus = NonNullable<SentRegistryEntry['deliveryStatus']>

const ENROLL_IN_TEXT = /\/enroll\/[^\s<>"']+/g

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function isEnrollPreviewUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return /^\/enroll\/[^/]+$/.test(parsed.pathname.replace(/\/$/, ''))
  } catch {
    return false
  }
}

/** Prospect sends only. Owner inbox tests (`wave: test`) are not the bounce sample. */
export function recentDeliveryStatuses(entries: SentRegistryEntry[]): CampaignDeliveryStatus[] {
  return entries
    .filter((entry) => entry.wave !== 'test')
    .slice(-RECENT_BOUNCE_WINDOW)
    .map((entry) => entry.deliveryStatus ?? 'unknown')
}

export function summarizeBounceRate(statuses: CampaignDeliveryStatus[]): {
  window: number
  known: number
  bounced: number
  rate: number
} {
  const knownStatuses = statuses.filter((status) => status !== 'unknown')
  const bounced = knownStatuses.filter((status) => status === 'bounced').length
  const known = knownStatuses.length
  return {
    window: statuses.length,
    known,
    bounced,
    rate: known === 0 ? 0 : bounced / known,
  }
}

function formatPercent(rate: number): string {
  const pct = rate * 100
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`
}

export function bounceRateMeasurementWarning(statuses: CampaignDeliveryStatus[]): string | null {
  const sample = summarizeBounceRate(statuses)
  if (sample.window === 0 || sample.known > 0) return null
  return `Bounce rate not measured: none of the last ${sample.window} sent-registry sends have a delivery status. Set deliveryStatus from Resend (not a send) before preparing. Not pausing, because the rate is unknown.`
}

/** Refuse a send-ready prepare while CAMPAIGN_POSTAL_ADDRESS is unset. */
export function assertCampaignPostalAddress(value?: string | null): string {
  const postal = usableCampaignPostalAddress(value === undefined ? campaignPostalAddress() : value)
  if (!postal) {
    throw new CampaignPrepareError(
      'Refusing to prepare: CAMPAIGN_POSTAL_ADDRESS is unset. CAN-SPAM requires a valid postal address before a send-ready email. Do not invent one.'
    )
  }
  return postal
}

export function assertRecentBounceRate(statuses: CampaignDeliveryStatus[]): void {
  const sample = summarizeBounceRate(statuses)
  if (sample.known === 0) return
  if (sample.rate > MAX_RECENT_BOUNCE_RATE) {
    throw new CampaignPrepareError(
      `Refusing to prepare: recent bounce rate is ${formatPercent(sample.rate)} (${sample.bounced} bounced of ${sample.known} sends with known status, out of ${sample.window} recent sends; limit is 5%). PAUSE the campaign and do not send.`
    )
  }
}

export async function assertRecipientDomainHasMx(
  email: string,
  resolveMxRecords: (domain: string) => Promise<ReadonlyArray<{ exchange: string }>> = resolveMx
): Promise<void> {
  const normalized = normalizeEmail(email)
  const domain = normalized.split('@')[1]
  if (!domain || !normalized.includes('@')) {
    throw new CampaignPrepareError(`Refusing to prepare: ${email} is not a usable email address.`)
  }
  try {
    const records = await resolveMxRecords(domain)
    if (!records.length) {
      throw new CampaignPrepareError(
        `Refusing to prepare: ${domain} has no MX record, so ${normalized} cannot receive mail.`
      )
    }
  } catch (err) {
    if (err instanceof CampaignPrepareError) throw err
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ESERVFAIL') {
      throw new CampaignPrepareError(
        `Refusing to prepare: ${domain} has no MX record, so ${normalized} cannot receive mail.`
      )
    }
    throw new CampaignPrepareError(
      `Refusing to prepare: MX lookup failed for ${domain} (${code ?? 'unknown'}).`
    )
  }
}

export function assertCampaignPreviewLinks(text: string, html: string): void {
  const textLinks = text.match(ENROLL_IN_TEXT) ?? []
  const htmlAnchors = html.match(/<a\b[^>]*\bhref="[^"]*\/enroll\/[^"]+"/gi) ?? []
  if (/link below/i.test(text) && textLinks.length === 0) {
    throw new CampaignPrepareError(
      'Refusing to prepare: the email says to use the link below, but it has no /enroll/<token> preview link.'
    )
  }
  if (textLinks.length !== 1 || htmlAnchors.length !== 1) {
    throw new CampaignPrepareError(
      `Refusing to prepare: campaign email must contain exactly one /enroll/<token> preview link (text ${textLinks.length}, html links ${htmlAnchors.length}).`
    )
  }
  const textSearch = text.match(/\/search\?/g) ?? []
  const htmlSearch = html.match(/\/search\?/g) ?? []
  if (textSearch.length > 1 || htmlSearch.length > 1) {
    throw new CampaignPrepareError(
      `Refusing to prepare: search URL appears more than once (text ${textSearch.length}, html ${htmlSearch.length}).`
    )
  }
}

export function renderCampaignManagerEmail(input: {
  to: string
  businessName: string
  city: string
  category: string
  wave: CampaignEmailWave
  enrollUrl?: string
  siteUrl: string
  skipCompliance?: boolean
}): { subject: string; text: string; html: string; headers: Record<string, string> } {
  const template = input.wave === 'listed' ? LISTED_MESSAGE : DEFAULT_MESSAGE
  const body = expandCampaignMessage(template, {
    businessName: input.businessName,
    city: input.city,
    category: input.category,
  })
  const reason = campaignFooterText(input.wave)
  const compliance = input.skipCompliance
    ? {
        text: `\n\n${reason}\nUnsubscribe: (set at send time)`,
        html: reason,
        headers: {} as Record<string, string>,
      }
    : (() => {
        const unsubUrl = buildUnsubscribeUrl(input.to)
        return {
          text: `\n\n${reason}\nUnsubscribe: ${unsubUrl}`,
          html: `${escapeHtml(reason).replace(/\n/g, '<br/>')}<br/><a href="${escapeHtml(unsubUrl)}">Unsubscribe</a>`,
          headers: {
            'List-Unsubscribe': `<${unsubUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }
      })()

  const emailOpts = {
    city: input.city,
    category: input.category,
    enrollUrl: input.enrollUrl,
    campaignWave: input.wave,
  }
  const { text, html } = buildPersonalMarketingEmail(
    input.businessName,
    body,
    emailOpts,
    compliance,
    input.siteUrl
  )
  return {
    subject: buildMarketingEmailSubject(input.businessName, emailOpts),
    text,
    html,
    headers: compliance.headers,
  }
}
