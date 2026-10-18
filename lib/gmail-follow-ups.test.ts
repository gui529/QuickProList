import { describe, expect, it } from 'vitest'
import {
  GMAIL_AD_LINE,
  GMAIL_FROM_DISPLAY_NAME,
  GMAIL_MISSING_POSTAL_REASON,
  GMAIL_OPT_OUT_LINE,
  GMAIL_TEST_FROM,
} from './gmail-campaign'
import {
  followUpSkipReason,
  nextFollowUpStep,
  planGmailDay,
  prepareGmailFollowUp,
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
      postalAddress: '1 Test Street, Atlanta, GA 30301',
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
      postalAddress: '1 Test Street, Atlanta, GA 30301',
    })
    expect(day18.text).toContain('If you ever want the Ready Plumbing listing')
    expect(day18.text).not.toContain('https://www.quickprolist.com/enroll/abc')
    expect(day18.text).toContain(GMAIL_OPT_OUT_LINE)
    expect(day18.text).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/)
    expect(message.text).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/)
    expect(day10.text).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/)
  })

  it('holds a follow-up with price_mismatch when the price is empty or not 29.99', () => {
    const base = {
      businessName: 'Ready Plumbing',
      enrollUrl: 'https://www.quickprolist.com/enroll/abc',
      subject: 'your Marietta listing preview',
      trialDays: 30,
      postalAddress: '1 Test Street, Atlanta, GA 30301',
    }
    for (const step of [4, 10, 18] as const) {
      for (const price of ['', '   ', '$19.99', '30', 'Flat']) {
        const held = prepareGmailFollowUp({ ...base, step, price })
        expect(held).toEqual({ status: 'held', reason: 'price_mismatch' })
        expect(() => renderGmailFollowUp({ ...base, step, price })).toThrow(/not 29\.99/)
      }
    }
    const missingPostalToo = prepareGmailFollowUp({ ...base, step: 10, price: '', postalAddress: '' })
    expect(missingPostalToo).toEqual({ status: 'held', reason: 'price_mismatch' })

    for (const price of ['$29.99', '29.99']) {
      const ready = prepareGmailFollowUp({ ...base, step: 10, price })
      expect(ready.status).toBe('ready')
      if (ready.status !== 'ready') continue
      expect(ready.message.text).toContain('Flat $29.99/month after the free 30 days')
      expect(ready.message.text).not.toContain('Flat /month')
      expect(ready.message.text).not.toContain('$19.99')
      expect(ready.message.text).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/)
    }
  })

  it('holds a follow-up when the postal address is missing and renders it when set', () => {
    const base = {
      step: 4 as const,
      businessName: 'Ready Plumbing',
      enrollUrl: 'https://www.quickprolist.com/enroll/abc',
      subject: 'Ready Plumbing preview',
      trialDays: 30,
      price: '$29.99',
    }
    for (const postalAddress of [undefined, '', '   ', '{postalAddress}']) {
      const held = prepareGmailFollowUp({ ...base, postalAddress })
      expect(held).toEqual({ status: 'held', reason: GMAIL_MISSING_POSTAL_REASON })
      expect(() => renderGmailFollowUp({ ...base, postalAddress })).toThrow(/postal address/)
    }
    const ready = prepareGmailFollowUp({ ...base, postalAddress: '1 Test Street, Atlanta, GA 30301' })
    expect(ready.status).toBe('ready')
    if (ready.status !== 'ready') return
    expect(ready.message.text.trim().endsWith('1 Test Street, Atlanta, GA 30301')).toBe(true)
    expect(ready.message.text).not.toContain('{postalAddress}')
    expect(ready.message.text).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/)
  })

  it('skips a follow-up after a reply, an opt-out, a suppression, enrollment, or an expired link', () => {
    const now = new Date('2026-10-10T15:00:00.000Z')
    const live = { status: 'pending', expiresAt: '2026-11-01T00:00:00.000Z' }
    const source = 'own_site' as const
    expect(followUpSkipReason({ source, invitation: live, now })).toBeNull()
    expect(followUpSkipReason({ source, replied: true, invitation: live, now })).toBe('replied')
    expect(followUpSkipReason({ source, optedOut: true, invitation: live, now })).toBe('opted_out')
    expect(followUpSkipReason({ source, suppressed: true, invitation: live, now })).toBe('suppressed')
    expect(followUpSkipReason({ source, invitation: { status: 'trial', expiresAt: live.expiresAt }, now })).toBe(
      'enrolled'
    )
    expect(followUpSkipReason({ source, invitation: { status: 'paid', expiresAt: live.expiresAt }, now })).toBe(
      'enrolled'
    )
    expect(
      followUpSkipReason({ source, invitation: { status: 'pending', expiresAt: '2026-10-01T00:00:00.000Z' }, now })
    ).toBe('expired_link')
    expect(followUpSkipReason({ source, invitation: { status: 'expired', expiresAt: live.expiresAt }, now })).toBe(
      'expired_link'
    )
    expect(followUpSkipReason({ source, invitation: null, now })).toBe('expired_link')
  })

  it('skips a follow-up whose prospect source is missing, Yelp, or unknown', () => {
    const now = new Date('2026-10-10T15:00:00.000Z')
    const live = { status: 'pending', expiresAt: '2026-11-01T00:00:00.000Z' }
    for (const source of ['own_site', 'chamber', 'ga_sos', 'ga_license'] as const) {
      expect(followUpSkipReason({ source, invitation: live, now })).toBeNull()
    }
    for (const source of [undefined, null, '', '   ', 'Yelp', 'yelp', 'curated']) {
      expect(followUpSkipReason({ source, invitation: live, now })).toBe('disallowed_source')
    }
    expect(followUpSkipReason({ source: 'Yelp', suppressed: true, invitation: live, now })).toBe('suppressed')
  })

  it('treats a company-domain opt-out as suppression and leaves other gmail addresses alone', () => {
    const now = new Date('2026-10-10T15:00:00.000Z')
    const live = { status: 'pending', expiresAt: '2026-11-01T00:00:00.000Z' }
    const source = 'own_site'
    expect(
      followUpSkipReason({
        source,
        email: 'info@itsbyjay.com',
        suppressedEmails: ['contact@itsbyjay.com'],
        invitation: live,
        now,
      })
    ).toBe('suppressed')
    expect(
      followUpSkipReason({
        source,
        email: 'other.person@gmail.com',
        suppressedEmails: ['opted.out@gmail.com'],
        invitation: live,
        now,
      })
    ).toBeNull()
    expect(
      followUpSkipReason({
        source,
        email: 'opted.out@gmail.com',
        suppressedEmails: ['opted.out@gmail.com'],
        invitation: live,
        now,
      })
    ).toBe('suppressed')
  })

  it('schedules due follow-ups before new contacts inside the cap of 5', () => {
    const followUps = ['f1', 'f2', 'f3']
    const fresh = ['n1', 'n2', 'n3', 'n4']
    const plan = planGmailDay(followUps, fresh, 5)
    expect(plan.scheduled).toEqual(['f1', 'f2', 'f3', 'n1', 'n2'])
    expect(plan.deferred).toEqual(['n3', 'n4'])
  })
})
