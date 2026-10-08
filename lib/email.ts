import { Resend } from 'resend'
import { formatCategoryLabel, formatCityLabel } from './display'
import { SuppressedError, isSuppressed, normalizeEmail } from './suppressions'
import { buildUnsubscribeUrl } from './unsubscribe'

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not configured')
  return new Resend(key)
}

/** Resend accepts `Name <addr@domain>`; bare env values get a consistent display name. */
export function formatFromAddress(raw: string): string {
  const trimmed = raw.trim()
  if (/^[^<]+<.+>$/.test(trimmed)) return trimmed
  return `QuickProList <${trimmed}>`
}

export function buildMarketingEmailSubject(businessName: string, opts: SendEmailOptions): string {
  const city = opts.city ? formatCityLabel(opts.city) : null
  const category = opts.category ? formatCategoryLabel(opts.category) : null
  if (city) return `Quick question — ${businessName} in ${city}`
  if (category) return `Quick question — ${businessName} (${category})`
  return `Quick question — ${businessName}`
}

export function buildMarketingCtaLabel(opts: SendEmailOptions): string {
  if (opts.enrollUrl) return 'See your listing preview'
  if (opts.city && opts.category) {
    return `See ${formatCategoryLabel(opts.category)} in ${formatCityLabel(opts.city)}`
  }
  return 'Visit QuickProList'
}

function buildTransactionalEmailSubject(businessName: string, body: string): string {
  if (body.includes('dashboard:')) return 'Your QuickProList dashboard is ready'
  if (body.includes("weren't able to process")) return 'QuickProList payment issue — action needed'
  return `QuickProList — ${businessName}`
}

/**
 * Marks mail the recipient did not ask for. `sendEmail` defaults to
 * `'marketing'` so a caller that forgets to say gets the stricter behavior.
 * Use `'transactional'` only for account/billing notices to an existing
 * subscriber (payment failure, welcome) — those are never suppressed.
 */
export type EmailKind = 'marketing' | 'transactional'

interface ComplianceFooter {
  html: string
  text: string
  headers: Record<string, string>
}

/** Throws if marketing email can't be sent compliantly; call before doing any per-recipient work. */
export function assertMarketingEmailConfigured(): void {
  if (!process.env.UNSUBSCRIBE_SECRET && !process.env.CRON_SECRET) {
    throw new Error('UNSUBSCRIBE_SECRET (or CRON_SECRET) not configured (required for marketing email)')
  }
}

function marketingCompliance(to: string, reason: string): ComplianceFooter {
  assertMarketingEmailConfigured()
  const url = buildUnsubscribeUrl(to)
  return {
    html: `${escapeHtml(reason)}<br/>
        <a href="${url}" style="color:#64748b;text-decoration:underline">Unsubscribe</a>`,
    text: `\n\n${reason}\nUnsubscribe: ${url}`,
    headers: {
      'List-Unsubscribe': `<${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

export interface SendEmailOptions {
  kind?: EmailKind
  yelpId?: string
  category?: string
  city?: string
  enrollUrl?: string
  /** Overrides default subject (marketing vs transactional). */
  subject?: string
}

export async function sendEmail(
  to: string,
  businessName: string,
  body: string,
  opts: SendEmailOptions = {}
): Promise<string> {
  const fromRaw = process.env.RESEND_FROM_EMAIL
  if (!fromRaw) throw new Error('RESEND_FROM_EMAIL not configured')
  const from = formatFromAddress(fromRaw)
  const isMarketing = (opts.kind ?? 'marketing') === 'marketing'

  let compliance: ComplianceFooter | null = null
  if (isMarketing) {
    const normalized = normalizeEmail(to)
    if (await isSuppressed('email', normalized)) throw new SuppressedError('email', normalized)
    compliance = marketingCompliance(
      to,
      'You received this one-time note because your business offers home services in an area we cover on QuickProList.'
    )
  }

  const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')
  const searchUrl =
    opts.city && opts.category
      ? `${siteUrl}/search?where=${encodeURIComponent(opts.city)}&category=${encodeURIComponent(opts.category)}`
      : null

  const ctaUrl = opts.enrollUrl ?? searchUrl ?? siteUrl
  const ctaLabel = buildMarketingCtaLabel(opts)

  const paragraphs = body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155">${escapeHtml(line)}</p>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 40px">
      <a href="${siteUrl}" style="text-decoration:none">
        <div style="display:inline-flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#f59e0b;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <span style="color:#0f172a;font-weight:900;font-size:16px">Q</span>
          </div>
          <span style="color:#ffffff;font-weight:700;font-size:18px;letter-spacing:-0.3px">QuickProList</span>
        </div>
      </a>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px">Connecting homeowners with local pros</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 40px">
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3">Hi ${escapeHtml(businessName)},</h1>

      ${paragraphs}

      <!-- CTA button -->
      <div style="text-align:center;margin:28px 0">
        <a href="${ctaUrl}" style="display:inline-block;background:#f59e0b;color:#0f172a;font-weight:800;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:50px;letter-spacing:-0.2px">
          ${ctaLabel}
        </a>
      </div>

      ${
        isMarketing
          ? `<p style="margin:0 0 8px;text-align:center;font-size:13px;line-height:1.6;color:#94a3b8">Pinned listings are $29.99/month after preview. Cancel anytime.</p>`
          : ''
      }

      ${
        searchUrl
          ? `<p style="text-align:center;margin:0 0 8px;font-size:13px;color:#94a3b8">
          <a href="${searchUrl}" style="color:#64748b;text-decoration:underline">View ${opts.city} ${opts.category} listings</a>
        </p>`
          : ''
      }
      <p style="text-align:center;margin:0;font-size:13px;color:#94a3b8">
        <a href="${siteUrl}" style="color:#64748b;text-decoration:underline">${siteUrl.replace('https://', '')}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px">
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
        ${
          compliance
            ? compliance.html
            : 'You received this because you have a QuickProList listing or account.'
        }
      </p>
    </div>

  </div>
</body>
</html>`

  const subject =
    opts.subject ??
    (isMarketing ? buildMarketingEmailSubject(businessName, opts) : buildTransactionalEmailSubject(businessName, body))

  const client = getClient()
  const { data, error } = await client.emails.send({
    from,
    to,
    subject,
    html,
    text:
      body +
      `\n\n${opts.enrollUrl ? `See your listing preview: ${opts.enrollUrl}` : searchUrl ? `See ${opts.city && opts.category ? `${formatCategoryLabel(opts.category)} in ${formatCityLabel(opts.city)}` : 'listings in your area'}: ${searchUrl}` : `Visit us: ${siteUrl}`}` +
      (compliance?.text ?? ''),
    ...(compliance ? { headers: compliance.headers } : {}),
  })
  if (error) throw new Error(error.message)
  return data?.id ?? ''
}

export interface DigestStats {
  searchImpressions: number
  profileViews: number
  phoneClicks: number
  websiteClicks: number
  directionsClicks: number
}

const DIGEST_STAT_ROWS: Array<{ key: keyof DigestStats; label: string }> = [
  { key: 'searchImpressions', label: 'Search appearances' },
  { key: 'profileViews', label: 'Profile views' },
  { key: 'phoneClicks', label: 'Phone clicks' },
  { key: 'websiteClicks', label: 'Website clicks' },
  { key: 'directionsClicks', label: 'Directions clicks' },
]

/**
 * Send a recurring performance-digest email to a subscribed business,
 * summarizing its own lifetime stats (the same numbers shown on its
 * `/dashboard/[token]` page). Distinct from `sendEmail` above, which is a
 * cold-outreach pitch to a *prospective* business — this is a retention
 * email to an *already-subscribed* one, so it skips the pricing card and
 * sales CTA entirely.
 */
export async function sendDigestEmail(
  to: string,
  businessName: string,
  stats: DigestStats
): Promise<string> {
  const fromRaw = process.env.RESEND_FROM_EMAIL
  if (!fromRaw) throw new Error('RESEND_FROM_EMAIL not configured')
  const from = formatFromAddress(fromRaw)

  const normalized = normalizeEmail(to)
  if (await isSuppressed('email', normalized)) throw new SuppressedError('email', normalized)
  const compliance = marketingCompliance(to, 'You received this because your business has an active QuickProList listing.')

  const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')

  const statRowsHtml = DIGEST_STAT_ROWS.map(
    ({ key, label }) => `
        <tr>
          <td style="padding:10px 0;font-size:15px;color:#334155">${escapeHtml(label)}</td>
          <td style="padding:10px 0;font-size:20px;font-weight:800;color:#0f172a;text-align:right">${stats[key].toLocaleString()}</td>
        </tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 40px">
      <a href="${siteUrl}" style="text-decoration:none">
        <div style="display:inline-flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#f59e0b;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <span style="color:#0f172a;font-weight:900;font-size:16px">Q</span>
          </div>
          <span style="color:#ffffff;font-weight:700;font-size:18px;letter-spacing:-0.3px">QuickProList</span>
        </div>
      </a>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px">Your performance digest</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 40px">
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f172a;line-height:1.2">Hi ${escapeHtml(businessName)}, here's how your listing is doing</h1>

      <table style="width:100%;border-collapse:collapse">
        ${statRowsHtml}
      </table>

      <div style="text-align:center;margin:28px 0 8px">
        <a href="${siteUrl}" style="display:inline-block;background:#f59e0b;color:#0f172a;font-weight:800;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:50px;letter-spacing:-0.2px">
          View QuickProList →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px">
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
        ${compliance.html}
      </p>
    </div>

  </div>
</body>
</html>`

  const text = [
    `Hi ${businessName}, here's how your listing is doing:`,
    '',
    ...DIGEST_STAT_ROWS.map(({ key, label }) => `${label}: ${stats[key]}`),
    '',
    `View QuickProList: ${siteUrl}`,
  ].join('\n') + compliance.text

  const client = getClient()
  const { data, error } = await client.emails.send({
    from,
    to,
    subject: `Your QuickProList performance digest — ${businessName}`,
    html,
    text,
    headers: compliance.headers,
  })
  if (error) throw new Error(error.message)
  return data?.id ?? ''
}
