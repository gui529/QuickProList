import { Resend } from 'resend'
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

function marketingCompliance(to: string, reason: string): ComplianceFooter {
  const address = process.env.MAILING_ADDRESS
  if (!address) throw new Error('MAILING_ADDRESS not configured (required for marketing email)')
  const url = buildUnsubscribeUrl(to)
  return {
    html: `${escapeHtml(reason)}<br/>
        <a href="${url}" style="color:#64748b;text-decoration:underline">Unsubscribe</a> &middot; ${escapeHtml(address)}`,
    text: `\n\n${reason}\nUnsubscribe: ${url}\n${address}`,
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
}

export async function sendEmail(
  to: string,
  businessName: string,
  body: string,
  opts: SendEmailOptions = {}
): Promise<string> {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) throw new Error('RESEND_FROM_EMAIL not configured')

  let compliance: ComplianceFooter | null = null
  if ((opts.kind ?? 'marketing') === 'marketing') {
    const normalized = normalizeEmail(to)
    if (await isSuppressed('email', normalized)) throw new SuppressedError('email', normalized)
    compliance = marketingCompliance(
      to,
      'You received this because your business appears on Yelp as a local service provider.'
    )
  }

  const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')
  const searchUrl =
    opts.city && opts.category
      ? `${siteUrl}/search?where=${encodeURIComponent(opts.city)}&category=${encodeURIComponent(opts.category)}`
      : null

  const ctaUrl = opts.enrollUrl ?? searchUrl ?? siteUrl
  const ctaLabel = opts.enrollUrl ? 'Claim Your Spot on QuickProList →' : 'See What Your Listing Looks Like →'

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
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px">Connecting homeowners with trusted local pros</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 40px">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#f59e0b">Featured Listing Opportunity</p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:800;color:#0f172a;line-height:1.2">Hi ${escapeHtml(businessName)}!</h1>

      ${paragraphs}

      <!-- Pricing card -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px 24px;margin:24px 0">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
          <div>
            <p style="margin:0 0 4px;font-size:13px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Permanent Listing</p>
            <p style="margin:0;font-size:28px;font-weight:900;color:#0f172a">$29.99<span style="font-size:14px;font-weight:500;color:#64748b">/month</span></p>
          </div>
          <ul style="margin:0;padding:0;list-style:none">
            <li style="font-size:13px;color:#334155;margin-bottom:6px">✓ &nbsp;Show up in local searches</li>
            <li style="font-size:13px;color:#334155;margin-bottom:6px">✓ &nbsp;Dedicated pro profile page</li>
            <li style="font-size:13px;color:#334155">✓ &nbsp;Cancel anytime</li>
          </ul>
        </div>
      </div>

      <!-- CTA button -->
      <div style="text-align:center;margin:28px 0">
        <a href="${ctaUrl}" style="display:inline-block;background:#f59e0b;color:#0f172a;font-weight:800;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:50px;letter-spacing:-0.2px">
          ${ctaLabel}
        </a>
      </div>

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

  const client = getClient()
  const { data, error } = await client.emails.send({
    from,
    to,
    subject: `🏠 Feature ${businessName} on QuickProList — $29.99/mo`,
    html,
    text:
      body +
      `\n\n${opts.enrollUrl ? `Get listed here: ${opts.enrollUrl}` : searchUrl ? `See listings in your area: ${searchUrl}` : `Visit us: ${siteUrl}`}` +
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
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) throw new Error('RESEND_FROM_EMAIL not configured')

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
