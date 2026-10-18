import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  findPriorContact,
  formatDateTimeEt,
  priorContactMessage,
  recordGmailSend,
} from './campaign-contact-history'
import type { SentRegistryEntry } from './campaign-sent-registry'

const sentRow = (email: string, businessName: string): SentRegistryEntry => ({
  email,
  businessName,
  city: 'atlanta',
  category: 'plumbing',
  batch: 'b',
  resendId: 'r',
  subject: 's',
  sentAt: '2026-10-15T21:20:00.000Z',
  wave: 'listed',
  deliveryStatus: 'delivered',
})

describe('campaign contact history', () => {
  let root: string

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true })
  })

  it('refuses an address already in the Resend registry, ignoring case', () => {
    const prior = findPriorContact(
      'Info@Example.com',
      'Other Co',
      { resend: [sentRow('info@example.com', 'Example Co')], gmail: [] }
    )
    expect(prior?.match).toBe('email')
    expect(prior?.source).toBe('resend')
    expect(priorContactMessage('Info@Example.com', prior!)).toMatch(/REFUSED already contacted/)
  })

  it('refuses the same domain and business even when the mailbox differs', () => {
    const prior = findPriorContact(
      'owner@acme.example',
      'Acme & Plumbing',
      { resend: [sentRow('info@acme.example', 'Acme & Plumbing')], gmail: [] }
    )
    expect(prior?.match).toBe('domain_business')
  })

  it('allows a different business on a domain that was already mailed', () => {
    const prior = findPriorContact(
      'owner@acme.example',
      'Other Plumbing',
      { resend: [sentRow('info@acme.example', 'Acme Plumbing')], gmail: [] }
    )
    expect(prior).toBeNull()
  })

  it('records a Gmail send and then refuses that address', () => {
    root = mkdtempSync(join(tmpdir(), 'qpl-gmail-'))
    mkdirSync(join(root, 'docs/campaigns'), { recursive: true })
    const now = new Date('2026-10-17T21:48:00.000Z')
    const row = recordGmailSend(
      {
        email: 'owner@new.example',
        businessName: 'New Plumbing',
        sentAtEt: '',
        gmailMessageId: 'gmail-msg-1',
        city: 'marietta',
        category: 'plumbing',
      },
      { repoRoot: root, now }
    )
    expect(row.sentAtEt).toBe(formatDateTimeEt(now))
    expect(row.sentAtEt).toMatch(/-0[45]:00$/)
    expect(row.gmailMessageId).toBe('gmail-msg-1')

    expect(() =>
      recordGmailSend(
        {
          email: 'OWNER@new.example',
          businessName: 'New Plumbing',
          sentAtEt: '',
          gmailMessageId: 'gmail-msg-2',
        },
        { repoRoot: root, now }
      )
    ).toThrow(/REFUSED already contacted/)
  })
})
