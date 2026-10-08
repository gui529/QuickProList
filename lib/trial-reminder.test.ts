import { describe, expect, it } from 'vitest'
import { findTrialsNeedingReminder } from './trial-reminder'
import type { BusinessReport } from './reports'

function report(overrides: Partial<BusinessReport>): BusinessReport {
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
  it('includes trials ending within the horizon with email and no reminder sent', () => {
    const found = findTrialsNeedingReminder([report({})])
    expect(found).toHaveLength(1)
  })

  it('skips when reminder already sent', () => {
    const found = findTrialsNeedingReminder([
      report({ trial_reminder_sent_at: new Date().toISOString() }),
    ])
    expect(found).toHaveLength(0)
  })
})
