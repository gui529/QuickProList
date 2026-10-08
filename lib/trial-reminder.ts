import { getBusinessReports, type BusinessReport } from './reports'
import { sendEmail } from './email'
import { setTrialReminderSent } from './kv'
import { SuppressedError, isSuppressed, normalizeEmail } from './suppressions'

export interface TrialReminderSendResult {
  businessId: string
  contactEmail: string
  emailId: string
}

const DEFAULT_REMINDER_HOURS = 72

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

function composeReminderBody(report: BusinessReport, subscribeUrl: string): string {
  const end = report.trial_ends_at
    ? new Date(report.trial_ends_at).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      })
    : 'soon'
  return [
    `Your QuickProList preview for ${report.name} ends on ${end}.`,
    `So far you've had ${report.search_impressions.toLocaleString()} search appearances and ${report.profile_views.toLocaleString()} profile views.`,
    `Stay listed for $29.99/mo — cancel anytime:`,
    subscribeUrl,
  ].join('\n')
}

/**
 * One-time email ~72h before `trial_ends_at` for active preview listings.
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
    const subscribeUrl = token
      ? `${siteUrl}/enroll/${token}?subscribe=1`
      : siteUrl

    if (await isSuppressed('email', normalizeEmail(contactEmail))) {
      await setTrialReminderSent(report.id)
      continue
    }

    let emailId: string
    try {
      emailId = await sendEmail(
        contactEmail,
        report.name,
        composeReminderBody(report, subscribeUrl),
        { kind: 'transactional' }
      )
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
