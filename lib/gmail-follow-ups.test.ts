import { describe, expect, it } from 'vitest'
import {
  GMAIL_AD_LINE,
  GMAIL_FROM_DISPLAY_NAME,
  GMAIL_OPT_OUT_LINE,
  GMAIL_TEST_FROM,
} from './gmail-campaign'
import {
  followUpSkipReason,
  nextFollowUpStep,
  planGmailDay,
  renderGmailFollowUp,
} from './gmail-follow-ups'

const sentAt = new Date('2026-10-01T15:00:00.000Z')
const footer = `${GMAIL_AD_LINE} ${GMAIL_OPT_OUT_LINE}`

describe('Gmail follow-ups', () => {
  it('sends day 4, 10, and 18 in order and not before they are due', () => {
    expect(nextFollowUpStep(sentAt, new Date('2026-10-04T14:59:00.000Z'), [])).toBeNull()
    expect(nextFollowUpStep(sentAt, new Date('2026-10-05T15:00:00.000Z'), [])).toBe(4)
    expect(nextFollowUpStep(sentAt, new Date('2026-10-12T15:00:00.000Z'), [])).toBe(4)
    expect(nextFollowUpStep(sentAt, new Date('2026-10-12T15:00:00.000Z'), [4])).toBe(10)
    expect(nextFollowUpStep(sentAt, new Date('2026-10-20T15:00:00.000Z'), [4, 10])).toBe(18)
    expect(nextFollowUpStep(sentAt, new Date('2026-10-20T15:00:00.000Z'), [4, 10, 18])).toBeNull()
  })

  it('keeps the original subject, threads on the first message, and repeats the footer', () => {
    const message = renderGmailFollowUp({
      step: 4,
      businessName: 'Ready Plumbing',
      enrollUrl: 'https://www.quickprolist.com/enroll/abc?ref=gmail-ready-plumbing',
      subject: 'Ready Plumbing preview',
      trialDays: 30,
      price: '$29.99',
      postalAddress: '1 Test Street, Atlanta, GA 30301',
      inReplyTo: '<original@mail.gmail.com>',
      threadId: 'thread-1',
    })
    expect(message.subject).toBe('Ready Plumbing preview')
    expect(message.from).toBe(`"${GMAIL_FROM_DISPLAY_NAME}" <${GMAIL_TEST_FROM}>`)
    expect(message.inReplyTo).toBe('<original@mail.gmail.com>')
    expect(message.references).toBe('<original@mail.gmail.com>')
    expect(message.threadId).toBe('thread-1')
    expect(message.text).toContain('after 30 days and you\'re never billed')
    expect(message.text).toContain(footer)
    expect(message.text.trim().endsWith('1 Test Street, Atlanta, GA 30301')).toBe(true)

    const day10 = renderGmailFollowUp({
      step: 10,
      businessName: 'Ready Plumbing',
      enrollUrl: 'https://www.quickprolist.com/enroll/abc',
      subject: 'not a lead service',
      trialDays: 14,
      price: '$29.99',
    })
    expect(day10.subject).toBe('not a lead service')
    expect(day10.text).toContain('Flat $29.99/month after the free 14 days')
    expect(day10.text).toContain(footer)

    const day18 = renderGmailFollowUp({
      step: 18,
      businessName: 'Ready Plumbing',
      enrollUrl: 'https://www.quickprolist.com/enroll/abc',
      subject: 'Ready Plumbing preview',
      trialDays: 30,
      price: '$29.99',
    })
    expect(day18.text).toContain('If you ever want the Ready Plumbing listing')
    expect(day18.text).not.toContain('https://www.quickprolist.com/enroll/abc')
    expect(day18.text).toContain(GMAIL_OPT_OUT_LINE)
  })

  it('skips a follow-up after a reply, an opt-out, a suppression, enrollment, or an expired link', () => {
    const now = new Date('2026-10-10T15:00:00.000Z')
    const live = { status: 'pending', expiresAt: '2026-11-01T00:00:00.000Z' }
    expect(followUpSkipReason({ invitation: live, now })).toBeNull()
    expect(followUpSkipReason({ replied: true, invitation: live, now })).toBe('replied')
    expect(followUpSkipReason({ optedOut: true, invitation: live, now })).toBe('opted_out')
    expect(followUpSkipReason({ suppressed: true, invitation: live, now })).toBe('suppressed')
    expect(followUpSkipReason({ invitation: { status: 'trial', expiresAt: live.expiresAt }, now })).toBe('enrolled')
    expect(followUpSkipReason({ invitation: { status: 'paid', expiresAt: live.expiresAt }, now })).toBe('enrolled')
    expect(
      followUpSkipReason({ invitation: { status: 'pending', expiresAt: '2026-10-01T00:00:00.000Z' }, now })
    ).toBe('expired_link')
    expect(followUpSkipReason({ invitation: { status: 'expired', expiresAt: live.expiresAt }, now })).toBe(
      'expired_link'
    )
    expect(followUpSkipReason({ invitation: null, now })).toBe('expired_link')
  })

  it('schedules due follow-ups before new contacts inside the cap of 5', () => {
    const followUps = ['f1', 'f2', 'f3']
    const fresh = ['n1', 'n2', 'n3', 'n4']
    const plan = planGmailDay(followUps, fresh, 5)
    expect(plan.scheduled).toEqual(['f1', 'f2', 'f3', 'n1', 'n2'])
    expect(plan.deferred).toEqual(['n3', 'n4'])
  })
})
