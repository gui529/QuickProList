import { getBusinessReports, type BusinessReport } from './reports'
import { sendCommercialNotice } from './email'
import { setTrialReminderSent } from './kv'
import { formatPreviewEndDate } from './preview-date'
import { SuppressedError, isSuppressed, normalizeEmail } from './suppressions'

export interface TrialReminderSendResult {
  businessId: string
  contactEmail: string
  emailId: string
}

/** About 5 days before `trial_ends_at`. Override with `TRIAL_REMINDER_HOURS`. */
const DEFAULT_REMINDER_HOURS = 120

export function trialReminderHorizonMs(): number {
  const raw = process.env.TRIAL_REMINDER_HOURS?.trim()
  if (!raw) return DEFAULT_REMINDER_HOURS * 60 * 60 * 1000
  const hours = parseInt(raw, 10)
  return Number.isFinite(hours) && hours > 0 ? hours * 60 * 60 * 1000 : DEFAULT_REMINDER_HOURS * 60 * 60 * 1000
}

export function findTrialsNeedingReminder(
  reports: BusinessReport[],
  nowMs = Date.now()
): BusinessReport[] {
  const horizon = trialReminderHorizonMs()
  return reports.filter((r) => {
    if (r.current_status !== 'trial' || !r.contact_email || r.trial_reminder_sent_at) return false
    if (!r.trial_ends_at) return false
    const ends = new Date(r.trial_ends_at).getTime()
    return ends > nowMs && ends <= nowMs + horizon
  })
}

function activeTrialInvitationToken(report: BusinessReport): string | null {
  const now = Date.now()
  const trialInv = report.invitations.find(
    (i) =>
      i.status === 'trial' &&
      i.trial_ends_at &&
      new Date(i.trial_ends_at).getTime() > now
  )
  return trialInv?.token ?? null
}

export function trialReminderSubject(endDate: string): string {
  return `Your QuickProList preview ends ${endDate}`
}

/**
 * End-date notice is the first line. One product link (subscribe). The exact
 * "if you do nothing" sentence is required. The commercial footer is added
 * by `sendCommercialNotice`, not here.
 */
export function composeTrialReminderBody(name: string, endDate: string, subscribeUrl: string): string {
  return [
    `Your QuickProList preview for ${name} ends on ${endDate}.`,
    'Your listing stays in search until then. Subscribe to keep it listed after that date.',
    `If you do nothing, it comes down on ${endDate}. Nothing is charged.`,
    subscribeUrl,
  ].join('\n')
}

/**
 * One-time commercial email before `trial_ends_at` for active preview listings.
 * Default horizon is 120 hours (`TRIAL_REMINDER_HOURS`).
 * Invoked by `app/api/cron/trial-reminder/route.ts`.
 */
export async function sendTrialReminders(): Promise<TrialReminderSendResult[]> {
  const reports = await getBusinessReports()
  const candidates = findTrialsNeedingReminder(reports)
  if (candidates.length === 0) return []

  const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')
  const results: TrialReminderSendResult[] = []

  for (const report of candidates) {
    const contactEmail = report.contact_email as string
    const token = activeTrialInvitationToken(report)
    const subscribeUrl = token ? `${siteUrl}/enroll/${token}?subscribe=1` : siteUrl
    const endDate = formatPreviewEndDate(report.trial_ends_at as string)
    const subject = trialReminderSubject(endDate)
    const body = composeTrialReminderBody(report.name, endDate, subscribeUrl)

    if (await isSuppressed('email', normalizeEmail(contactEmail))) {
      await setTrialReminderSent(report.id)
      continue
    }

    let emailId: string
    try {
      emailId = await sendCommercialNotice(contactEmail, subject, body)
    } catch (err) {
      if (err instanceof SuppressedError) {
        await setTrialReminderSent(report.id)
        continue
      }
      throw err
    }

    await setTrialReminderSent(report.id)
    results.push({ businessId: report.id, contactEmail, emailId })
  }

  return results
}
