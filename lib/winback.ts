import { getBusinessReports, type BusinessReport } from './reports'
import { sendEmail } from './email'
import { createInvitation } from './invitations'
import { setWinbackSent } from './kv'
import { SuppressedError } from './suppressions'

export interface WinbackSendResult {
  businessId: string
  contactEmail: string
  emailId: string
}

/**
 * Businesses whose free trial expired without ever converting to a paid
 * subscription (`current_status === 'expired-trial'`) that haven't already
 * been sent a win-back email (`winback_sent_at IS NULL`) and have a
 * `contact_email` on file to send one to.
 */
export function findUnconvertedExpiredTrials(reports: BusinessReport[]): BusinessReport[] {
  return reports.filter(
    (r) => r.current_status === 'expired-trial' && !r.winback_sent_at && !!r.contact_email
  )
}

function composeWinbackMessage(report: BusinessReport): string {
  return [
    `Your free trial listing for ${report.name} on QuickProList has ended.`,
    `While it was live, your listing got ${report.search_impressions.toLocaleString()} search appearances and ${report.profile_views.toLocaleString()} profile views from homeowners looking for ${report.category} pros.`,
    `Keep that visibility going for $29.99/mo — cancel anytime.`,
  ].join('\n')
}

/**
 * Compose and send a one-time win-back email to every business in
 * `'expired-trial'` status (its free trial lapsed without entering Stripe
 * checkout) that hasn't already been sent one and has a `contact_email` on
 * file. Each email cites the business's own accumulated trial stats
 * (search impressions, profile views) as concrete, personalized proof of
 * value, and links to a fresh enrollment invitation so the business can
 * re-enter checkout directly. Marks `winback_sent_at` on send so a later
 * run of this job never emails the same business twice.
 *
 * Intended to be invoked on a schedule by `app/api/cron/winback/route.ts`.
 */
export async function sendWinbackEmails(): Promise<WinbackSendResult[]> {
  const reports = await getBusinessReports()
  const candidates = findUnconvertedExpiredTrials(reports)

  const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')

  const results: WinbackSendResult[] = []
  for (const report of candidates) {
    const contactEmail = report.contact_email as string
    const token = await createInvitation({
      businessName: report.name,
      category: report.category,
      cities: report.cities,
      monthlyPrice: 29.99,
      curatedBusinessId: report.id,
    })
    const enrollUrl = `${siteUrl}/enroll/${token}`

    let emailId: string
    try {
      emailId = await sendEmail(contactEmail, report.name, composeWinbackMessage(report), {
        enrollUrl,
      })
    } catch (err) {
      if (err instanceof SuppressedError) {
        await setWinbackSent(report.id)
        continue
      }
      throw err
    }
    await setWinbackSent(report.id)
    results.push({ businessId: report.id, contactEmail, emailId })
  }
  return results
}
