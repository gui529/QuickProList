import { describe, expect, it } from 'vitest'
import {
  buildGmailTestSubject,
  countWords,
  GMAIL_TEST_FROM,
  POSTAL_ADDRESS_PLACEHOLDER,
  renderGmailTestEmail,
} from './gmail-campaign'
import { buildGmailTestBatch } from './gmail-test-batch'
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
  it('stays under 80 words with one preview link, price after it, and a postal placeholder', () => {
    const rendered = renderGmailTestEmail({
      businessName: 'Peppers Heating & Air Conditioning',
      city: 'atlanta',
      category: 'airconditioningheating',
      enrollUrl: enroll,
    })
    expect(countWords(rendered.subject)).toBeGreaterThanOrEqual(3)
    expect(countWords(rendered.subject)).toBeLessThanOrEqual(7)
    expect(rendered.subject).toBe('Preview your Atlanta listing')
    expect(rendered.subject).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(rendered.wordCount).toBeLessThanOrEqual(80)
    expect(rendered.text.startsWith('Peppers Heating & Air Conditioning')).toBe(true)
    expect(rendered.text.match(/https?:\/\/\S+/g)).toEqual([enroll])
    expect(rendered.text.indexOf('$29.99/month')).toBeGreaterThan(rendered.text.indexOf(enroll))
    expect(rendered.text).toContain('No card, no invoice unless you choose to continue')
    expect(rendered.text).toContain('Reply "no" or "unsubscribe" and I won\'t email again.')
    expect(rendered.text).toContain(GMAIL_TEST_FROM)
    expect(rendered.text.trim().endsWith(POSTAL_ADDRESS_PLACEHOLDER)).toBe(true)
    expect(rendered.text).not.toContain('HVAC pros pros')
    expect(rendered.text).toContain('HVAC pros')
  })

  it('uses a short subject when the city name would run long', () => {
    expect(buildGmailTestSubject('one two three four five six')).toBe('Your listing preview')
  })
})

describe('Gmail test batch', () => {
  it('drops bounced, suppressed, already emailed, and no-MX addresses, and flags role mailboxes', () => {
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
    const batch = buildGmailTestBatch({
      prospects: [
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
      ],
      resend: sent,
      gmail: [],
      mxByDomain: {
        'peppersheatingandair.com': false,
        'colonyroofers.com': true,
        'patriotpowerelectrical.com': true,
        'nomx.example': false,
        'ready.example': true,
        'ready-role.example': true,
      },
      generatedAt: '2026-10-17T00:00:00.000Z',
    })

    expect(batch.board).toBe('PAUSED')
    expect(batch.readyToSend).toBe(false)
    expect(batch.sendReady.map((row) => row.email)).toEqual(['owner@ready.example'])
    expect(batch.sendReady[0]?.enrollUrl).toContain('/enroll/PENDING_INVITATION')
    expect(batch.sendReady[0]?.text).toContain('Ready Plumbing')
    expect(batch.sendReady[0]?.wordCount).toBeLessThanOrEqual(80)
    expect(batch.flagged.map((row) => row.email)).toEqual(['info@ready-role.example'])
    expect(batch.excluded.map((row) => [row.email, row.reason])).toEqual([
      ['info@peppersheatingandair.com', 'bounced'],
      ['help@colonyroofers.com', 'suppressed'],
      ['mjones@patriotpowerelectrical.com', 'already_emailed'],
      ['owner@nomx.example', 'no_mx'],
    ])
    expect(batch.needsEmail.map((row) => row.business)).toEqual(['Missing Email'])
  })
})
