import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BusinessReport } from './reports'

const sendCommercialNotice = vi.hoisted(() =>
  vi.fn<(to: string, subject: string, body: string, options?: unknown) => Promise<string>>(
    async () => 'email_1'
  )
)
const setTrialReminderSent = vi.hoisted(() => vi.fn(async () => undefined))
const isSuppressed = vi.hoisted(() => vi.fn(async () => false))
const getBusinessReports = vi.hoisted(() => vi.fn(async (): Promise<BusinessReport[]> => []))

vi.mock('./email', () => ({
  sendCommercialNotice,
}))

vi.mock('./kv', () => ({
  setTrialReminderSent,
}))

vi.mock('./suppressions', () => ({
  isSuppressed,
  normalizeEmail: (value: string) => value.trim().toLowerCase(),
  SuppressedError: class SuppressedError extends Error {
    constructor(
      public channel: string,
      public value: string
    ) {
      super('suppressed')
    }
  },
}))

vi.mock('./reports', () => ({
  getBusinessReports,
}))

import { findTrialsNeedingReminder, sendTrialReminders, trialReminderHorizonMs } from './trial-reminder'
import { formatPreviewEndDate } from './preview-date'
import type { EnrollmentInvitation } from './invitations'

function upcomingEnd(): string {
  return new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
}

function invitation(overrides: Partial<EnrollmentInvitation> = {}): EnrollmentInvitation {
  return {
    id: 'inv-1',
    token: 'tok-1',
    business_name: 'Biz',
    yelp_id: null,
    yelp_data: null,
    category: 'plumbing',
    cities: ['marietta'],
    monthly_price: 29.99,
    status: 'trial',
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: 'b1',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    canceled_at: null,
    trial_ends_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

function report(overrides: Partial<BusinessReport> = {}): BusinessReport {
  return {
    id: 'b1',
    name: 'Biz',
    source: 'manual',
    category: 'plumbing',
    cities: ['marietta'],
    pinned_at: new Date().toISOString(),
    is_trial: true,
    trial_ends_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    pro_site_enabled: false,
    current_status: 'trial',
    actions_count: 1,
    invitations: [],
    contact_email: 'a@b.com',
    search_impressions: 10,
    profile_views: 2,
    phone_clicks: 0,
    website_clicks: 0,
    directions_clicks: 0,
    winback_sent_at: null,
    trial_reminder_sent_at: null,
    ...overrides,
  }
}

describe('findTrialsNeedingReminder', () => {
  beforeEach(() => {
    delete process.env.TRIAL_REMINDER_HOURS
  })

  it('includes trials ending within the default 120-hour horizon', () => {
    const found = findTrialsNeedingReminder([
      report({ trial_ends_at: new Date(Date.now() + 100 * 60 * 60 * 1000).toISOString() }),
    ])
    expect(found).toHaveLength(1)
    expect(trialReminderHorizonMs()).toBe(120 * 60 * 60 * 1000)
  })

  it('skips trials ending after the horizon', () => {
    const found = findTrialsNeedingReminder([
      report({ trial_ends_at: new Date(Date.now() + 130 * 60 * 60 * 1000).toISOString() }),
    ])
    expect(found).toHaveLength(0)
  })

  it('honors TRIAL_REMINDER_HOURS when set', () => {
    process.env.TRIAL_REMINDER_HOURS = '24'
    const soon = report({ trial_ends_at: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString() })
    const later = report({
      id: 'b2',
      trial_ends_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    })
    expect(findTrialsNeedingReminder([soon, later]).map((r) => r.id)).toEqual(['b1'])
  })

  it('skips when reminder already sent', () => {
    const found = findTrialsNeedingReminder([
      report({ trial_reminder_sent_at: new Date().toISOString() }),
    ])
    expect(found).toHaveLength(0)
  })
})

describe('sendTrialReminders', () => {
  beforeEach(() => {
    sendCommercialNotice.mockClear()
    setTrialReminderSent.mockClear()
    isSuppressed.mockReset()
    isSuppressed.mockResolvedValue(false)
    getBusinessReports.mockReset()
    process.env.SITE_URL = 'https://example.test'
    delete process.env.TRIAL_REMINDER_HOURS
  })

  it('sends one commercial notice with the end date first, the required sentence, and one link', async () => {
    const end = upcomingEnd()
    const endLabel = formatPreviewEndDate(end)
    getBusinessReports.mockResolvedValue([
      report({
        trial_ends_at: end,
        invitations: [invitation({ trial_ends_at: end })],
      }),
    ])

    const sent = await sendTrialReminders()

    expect(sent).toEqual([{ businessId: 'b1', contactEmail: 'a@b.com', emailId: 'email_1' }])
    expect(sendCommercialNotice).toHaveBeenCalledTimes(1)
    const [to, subject, body] = sendCommercialNotice.mock.calls[0]
    expect(to).toBe('a@b.com')
    expect(subject).toBe(`Your QuickProList preview ends ${endLabel}`)
    expect(body.startsWith(`Your QuickProList preview for Biz ends on ${endLabel}.`)).toBe(true)
    expect(body).toContain('Your listing stays in search until then.')
    expect(body).toContain(`If you do nothing, it comes down on ${endLabel}. Nothing is charged.`)
    const urls = body.match(/https?:\/\/\S+/g) ?? []
    expect(urls).toEqual(['https://example.test/enroll/tok-1?subscribe=1'])
    expect(setTrialReminderSent).toHaveBeenCalledWith('b1')
  })

  it('does not email a suppressed address and still marks the reminder sent', async () => {
    isSuppressed.mockResolvedValue(true)
    const end = upcomingEnd()
    getBusinessReports.mockResolvedValue([
      report({
        trial_ends_at: end,
        invitations: [invitation({ trial_ends_at: end })],
      }),
    ])

    const sent = await sendTrialReminders()
    expect(sent).toEqual([])
    expect(sendCommercialNotice).not.toHaveBeenCalled()
    expect(setTrialReminderSent).toHaveBeenCalledWith('b1')
  })
})
