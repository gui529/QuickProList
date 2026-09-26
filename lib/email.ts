import { Resend } from 'resend'

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

export interface SendEmailOptions {
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
        You received this because your business appears on Yelp as a local service provider.
        To stop receiving emails like this, simply reply with "unsubscribe" and we'll remove you immediately.
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
    text: body + `\n\n${opts.enrollUrl ? `Get listed here: ${opts.enrollUrl}` : searchUrl ? `See listings in your area: ${searchUrl}` : `Visit us: ${siteUrl}`}`,
  })
  if (error) throw new Error(error.message)
  return data?.id ?? ''
}
