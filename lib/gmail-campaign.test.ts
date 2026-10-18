import { describe, expect, it } from 'vitest'
import {
  buildGmailTestSubject,
  countWords,
  ENROLL_URL_PLACEHOLDER,
  enrollUrlWithToken,
  GMAIL_TEST_BODY_TEMPLATE,
  GMAIL_TEST_SUBJECT_TEMPLATE,
  isEnrollPlaceholder,
  POSTAL_ADDRESS_PLACEHOLDER,
  renderGmailTestEmail,
  withGmailAttributionRef,
} from './gmail-campaign'
import { buildGmailTestBatch } from './gmail-test-batch'
import { isEnrollPreviewUrl } from './campaign-prepare'
import type { ProspectRecord } from './campaign-prospect-registry'
import type { SentRegistryEntry } from './campaign-sent-registry'

const enroll = 'https://www.quickprolist.com/enroll/11111111-1111-4111-8111-111111111111'

function prospect(partial: Partial<ProspectRecord> & Pick<ProspectRecord, 'businessName'>): ProspectRecord {
  return {
    email: 'owner@acme.example',
    city: 'atlanta',
    category: 'plumbing',
    source: 'manual',
    status: 'pending',
    websiteUrl: 'https://acme.example',
    emailSource: 'https://acme.example/contact',
    ...partial,
  }
}

describe('Gmail test copy', () => {
  it('uses the approved subject and body, with disclosure, signature, one link, opt-out, and a postal placeholder', () => {
    expect(GMAIL_TEST_SUBJECT_TEMPLATE).toBe('your {city} listing preview')
    expect(GMAIL_TEST_BODY_TEMPLATE).toBe(`Hi,

You probably get plenty of marketing pitches, so I'll keep this short.

I set up a preview listing for {businessName} on QuickProList, a local directory of {categoryPhrase} around {city}.

It's not a lead service: homeowners call you directly. No per-lead fees, no bidding against other pros.

Your preview is ready to look over (two minutes):
{enrollUrl}

The 30-day preview is free, no card needed. After that it's a flat $29.99/month if you stay.

Guilherme, QuickProList

This is a promotional email from QuickProList. Reply "no" and I won't email again.
{postalAddress}`)

    const rendered = renderGmailTestEmail({
      businessName: 'Marietta Plumbing',
      city: 'marietta',
      category: 'plumbing',
      enrollUrl: enroll,
    })
    expect(countWords(rendered.subject)).toBeGreaterThanOrEqual(3)
    expect(countWords(rendered.subject)).toBeLessThanOrEqual(7)
    expect(rendered.subject).toBe('your Marietta listing preview')
    expect(rendered.subject).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(rendered.text).toContain('This is a promotional email from QuickProList.')
    expect(rendered.text).toContain('Guilherme, QuickProList')
    expect(rendered.text).toContain('Reply "no" and I won\'t email again.')
    expect(rendered.text).toContain(`Reply "no" and I won't email again.\n${POSTAL_ADDRESS_PLACEHOLDER}`)
    expect(rendered.text.match(/https?:\/\/\S+/g)).toEqual([enroll])
    expect(rendered.text.indexOf('$29.99/month')).toBeGreaterThan(rendered.text.indexOf(enroll))
    expect(rendered.text).toContain('a local directory of plumbers around Marietta')
    expect(rendered.text.trim().endsWith(POSTAL_ADDRESS_PLACEHOLDER)).toBe(true)
  })

  it('keeps acronyms like HVAC while lowercasing the rest of the phrase', () => {
    const rendered = renderGmailTestEmail({
      businessName: 'Peppers Heating & Air Conditioning',
      city: 'atlanta',
      category: 'airconditioningheating',
      enrollUrl: enroll,
    })
    expect(rendered.subject).toBe('your Atlanta listing preview')
    expect(rendered.text).toContain('a local directory of HVAC pros around Atlanta')
    expect(rendered.text).not.toContain('HVAC pros pros')
  })

  it('uses a short lowercase subject when the city name would run long', () => {
    expect(buildGmailTestSubject('one two three four five six')).toBe('your listing preview')
  })

  it('adds a ref query without folding it into the enroll token', () => {
    const attributed = withGmailAttributionRef(ENROLL_URL_PLACEHOLDER, 'Marietta Plumbing')
    expect(attributed).toBe(
      'https://www.quickprolist.com/enroll/PENDING_INVITATION?ref=gmail-marietta-plumbing'
    )
    expect(isEnrollPlaceholder(attributed)).toBe(true)
    expect(isEnrollPreviewUrl(attributed)).toBe(true)
    expect(new URL(attributed).pathname).toBe('/enroll/PENDING_INVITATION')
    const live = enrollUrlWithToken('https://www.quickprolist.com', '11111111-1111-4111-8111-111111111111', attributed)
    expect(live).toBe(`${enroll}?ref=gmail-marietta-plumbing`)
    expect(new URL(live).pathname).toBe('/enroll/11111111-1111-4111-8111-111111111111')
  })
})

describe('Gmail test batch', () => {
  const prospects = [
    prospect({
      businessName: 'Peppers Heating & Air Conditioning',
      email: 'info@peppersheatingandair.com',
      category: 'airconditioningheating',
    }),
    prospect({
      businessName: 'Colony Roofers',
      email: 'help@colonyroofers.com',
      category: 'roofing',
    }),
    prospect({
      businessName: 'Patriot Power Electrical LLC',
      email: 'mjones@patriotpowerelectrical.com',
      category: 'electricians',
    }),
    prospect({
      businessName: 'No Mail Plumbing',
      email: 'owner@nomx.example',
      category: 'plumbing',
    }),
    prospect({
      businessName: 'Ready Plumbing',
      email: 'owner@ready.example',
    }),
    prospect({
      businessName: 'Info Plumbing',
      email: 'info@ready-role.example',
    }),
    prospect({ businessName: 'Missing Email', email: null }),
  ]
  const sent: SentRegistryEntry[] = [
    {
      email: 'info@peppersheatingandair.com',
      businessName: 'Peppers Heating & Air Conditioning',
      city: 'atlanta',
      category: 'airconditioningheating',
      batch: 'b',
      resendId: '1',
      subject: 's',
      sentAt: '2026-10-15T00:00:00.000Z',
      wave: 'listed',
      deliveryStatus: 'bounced',
    },
    {
      email: 'help@colonyroofers.com',
      businessName: 'Colony Roofers',
      city: 'atlanta',
      category: 'roofing',
      batch: 'b',
      resendId: '2',
      subject: 's',
      sentAt: '2026-10-17T00:00:00.000Z',
      wave: 'listed',
      deliveryStatus: 'suppressed',
    },
    {
      email: 'mjones@patriotpowerelectrical.com',
      businessName: 'Patriot Power Electrical LLC',
      city: 'atlanta',
      category: 'electricians',
      batch: 'b',
      resendId: '3',
      subject: 's',
      sentAt: '2026-10-15T00:00:00.000Z',
      wave: 'listed',
      deliveryStatus: 'delivered',
    },
  ]
  const mxByDomain = {
    'peppersheatingandair.com': false,
    'colonyroofers.com': true,
    'patriotpowerelectrical.com': true,
    'nomx.example': false,
    'ready.example': true,
    'ready-role.example': true,
  }

  it('holds a clean prospect out of sendReady while the postal address is unset', () => {
    const batch = buildGmailTestBatch({
      prospects,
      resend: sent,
      gmail: [],
      mxByDomain,
      generatedAt: '2026-10-17T00:00:00.000Z',
    })

    expect(batch.board).toBe('PAUSED')
    expect(batch.readyToSend).toBe(false)
    expect(batch.template.subject).toBe('your {city} listing preview')
    expect(batch.sendReady).toEqual([])
    expect(batch.held.map((row) => row.email)).toEqual(['owner@ready.example'])
    expect(batch.held[0]?.enrollUrl).toBe(
      'https://www.quickprolist.com/enroll/PENDING_INVITATION?ref=gmail-ready-plumbing'
    )
    expect(batch.held[0]?.text).toContain('Ready Plumbing')
    expect(batch.held[0]?.text).toContain('This is a promotional email from QuickProList.')
    expect(batch.held[0]?.text).toContain('Guilherme, QuickProList')
    expect(batch.held[0]?.text).toContain(POSTAL_ADDRESS_PLACEHOLDER)
    expect(batch.held[0]?.text.match(/https?:\/\/\S+/g)).toEqual([batch.held[0]?.enrollUrl])
    expect(batch.flagged.map((row) => row.email)).toEqual(['info@ready-role.example'])
    expect(batch.excluded.map((row) => [row.email, row.reason])).toEqual([
      ['info@peppersheatingandair.com', 'bounced'],
      ['help@colonyroofers.com', 'suppressed'],
      ['mjones@patriotpowerelectrical.com', 'already_emailed'],
      ['owner@nomx.example', 'no_mx'],
    ])
    expect(batch.needsEmail.map((row) => row.business)).toEqual(['Missing Email'])
  })

  it('puts a clean prospect in sendReady only when a real postal address is supplied', () => {
    const postal = '1 Test Street, Atlanta, GA 30301'
    const batch = buildGmailTestBatch({
      prospects,
      resend: sent,
      gmail: [],
      mxByDomain,
      postalAddress: postal,
      generatedAt: '2026-10-17T00:00:00.000Z',
    })
    expect(batch.sendReady.map((row) => row.email)).toEqual(['owner@ready.example'])
    expect(batch.held).toEqual([])
    expect(batch.readyToSend).toBe(false)
    expect(batch.sendReady[0]?.text).toContain(postal)
    expect(batch.sendReady[0]?.text).not.toContain(POSTAL_ADDRESS_PLACEHOLDER)
    expect(batch.sendReady[0]?.text).toContain('Reply "no" and I won\'t email again.')
  })

  it('treats the placeholder string as an unset postal address', () => {
    const batch = buildGmailTestBatch({
      prospects: [prospect({ businessName: 'Ready Plumbing', email: 'owner@ready.example' })],
      resend: [],
      gmail: [],
      mxByDomain: { 'ready.example': true },
      postalAddress: '{postalAddress}',
    })
    expect(batch.sendReady).toEqual([])
    expect(batch.held).toHaveLength(1)
  })
})
