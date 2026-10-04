import { Resend } from 'resend'
import type { ContactClickType } from './kv'

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * A curated business that can receive a real-time lead alert.
 * `contactEmail` is `curated_businesses.contact_email` (see `Business`).
 */
export interface LeadAlertBusiness {
  name: string
  contactEmail?: string | null
}

function renderLeadAlert(businessName: string, clickType: ContactClickType): {
  subject: string
  html: string
  text: string
} {
  const subject = `New ${clickType} lead for ${businessName}`
  const lines = [
    `A homeowner just clicked the ${clickType} link on ${businessName}'s QuickProList listing.`,
    'Responding quickly is the best way to win the job.',
  ]
  const text = lines.join('\n\n')
  const paragraphs = lines
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155">${escapeHtml(line)}</p>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)">
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 40px">
      <span style="color:#ffffff;font-weight:700;font-size:18px;letter-spacing:-0.3px">QuickProList</span>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px">New ${escapeHtml(clickType)} lead for ${escapeHtml(businessName)}</p>
    </div>
    <div style="padding:36px 40px">
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f172a;line-height:1.2">A homeowner clicked ${escapeHtml(clickType)} on ${escapeHtml(businessName)}</h1>
      ${paragraphs}
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px">
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">You received this because you have a QuickProList listing or account.</p>
    </div>
  </div>
</body>
</html>`

  return { subject, html, text }
}

/**
 * Email a business the moment a homeowner clicks call, website, or
 * directions on its ProSite. No-ops when there is no `contact_email` on
 * file. This is an account notice to a subscriber, so it is rendered and
 * delivered on its own. It does not use `sendEmail`, whose subject and HTML
 * are the cold-outreach listing pitch. Marketing opt-outs do not suppress it.
 */
export async function sendLeadAlertEmail(
  business: LeadAlertBusiness,
  clickType: ContactClickType
): Promise<void> {
  const to = business.contactEmail?.trim()
  if (!to) return

  const from = process.env.RESEND_FROM_EMAIL
  if (!from) throw new Error('RESEND_FROM_EMAIL not configured')
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not configured')

  const { subject, html, text } = renderLeadAlert(business.name, clickType)
  const { error } = await new Resend(key).emails.send({ from, to, subject, html, text })
  if (error) throw new Error(error.message)
}
