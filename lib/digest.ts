import { getBusinessReports } from './reports'
import { sendDigestEmail } from './email'

export interface DigestSendResult {
  businessId: string
  contactEmail: string
  emailId: string
}

/**
 * Compose and send a recurring performance-digest email to every
 * subscribed business — `current_status` of `'paid'` or `'trial'` — that
 * has a `contact_email` on file, summarizing the same lifetime stats
 * already shown on its `/dashboard/[token]` page (search appearances,
 * profile views, phone/website/directions clicks). Businesses with no
 * `contact_email`, or any other status (`'none'`, `'canceled'`,
 * `'pending'`, `'expired-trial'`), are skipped entirely.
 *
 * Intended to be invoked on a schedule by `app/api/cron/digest/route.ts`.
 */
export async function sendPerformanceDigests(): Promise<DigestSendResult[]> {
  const reports = await getBusinessReports()

  const eligible = reports.filter(
    (r) => (r.current_status === 'paid' || r.current_status === 'trial') && !!r.contact_email
  )

  const results: DigestSendResult[] = []
  for (const r of eligible) {
    const contactEmail = r.contact_email as string
    const emailId = await sendDigestEmail(contactEmail, r.name, {
      searchImpressions: r.search_impressions,
      profileViews: r.profile_views,
      phoneClicks: r.phone_clicks,
      websiteClicks: r.website_clicks,
      directionsClicks: r.directions_clicks,
    })
    results.push({ businessId: r.id, contactEmail, emailId })
  }
  return results
}
