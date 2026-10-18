import { describe, expect, it } from 'vitest'
import {
  assignGmailSubject,
  countWords,
  ENROLL_URL_PLACEHOLDER,
  enrollUrlWithToken,
  GMAIL_AD_LINE,
  GMAIL_FROM_DISPLAY_NAME,
  GMAIL_OPT_OUT_LINE,
  GMAIL_SUBJECT_B,
  GMAIL_TEST_BODY_TEMPLATE,
  GMAIL_TEST_DAILY_CAP,
  GMAIL_TEST_FROM,
  isEnrollPlaceholder,
  POSTAL_ADDRESS_PLACEHOLDER,
  REPLY_OPT_OUT_REASON,
  recordReplyOptOuts,
  renderGmailTestEmail,
  replyIsOptOut,
  withGmailAttributionRef,
} from './gmail-campaign'
import { buildGmailTestBatch, claimsByEmailFromInvitations, gmailSendReadyGroup } from './gmail-test-batch'
import type { EnrollmentInvitation } from './invitations'
import { formatSubscriptionPrice } from './subscription-terms'
import { isEnrollPreviewUrl } from './campaign-prepare'
import { loadProspectRegistry, type ProspectRecord } from './campaign-prospect-registry'
import { loadSentRegistry, type SentRegistryEntry } from './campaign-sent-registry'
import { planGmailDay } from './gmail-follow-ups'

const enroll = 'https://www.quickprolist.com/enroll/11111111-1111-4111-8111-111111111111'

function claimsFor(rows: Array<Pick<ProspectRecord, 'email'>>): Record<string, { monthlyPrice: number }> {
  const claims: Record<string, { monthlyPrice: number }> = {}
  for (const row of rows) {
    if (row.email) claims[row.email.trim().toLowerCase()] = { monthlyPrice: 29.99 }
  }
  return claims
}

function prospect(partial: Partial<ProspectRecord> & Pick<ProspectRecord, 'businessName'>): ProspectRecord {
  return {
    email: 'owner@acme.example',
    city: 'atlanta',
    category: 'plumbing',
    source: 'own_site',
    status: 'pending',
    websiteUrl: 'https://acme.example',
    emailSource: 'https://acme.example/contact',
    ...partial,
  }
}

describe('Gmail test copy', () => {
  it('uses the approved body, footer, one link, and a From display name', () => {
    expect(GMAIL_TEST_BODY_TEMPLATE).toContain(
      "If you click start, it's live in search for {trialDays} days, free, no card."
    )
    expect(GMAIL_TEST_BODY_TEMPLATE).toContain(`${GMAIL_AD_LINE} ${GMAIL_OPT_OUT_LINE} {postalAddress}`)

    const postal = '1 Test Street, Atlanta, GA 30301'
    const rendered = renderGmailTestEmail({
      businessName: 'Marietta Plumbing',
      email: 'owner@marietta.example',
      city: 'marietta',
      category: 'plumbing',
      enrollUrl: enroll,
      hasPhone: true,
      monthlyPrice: 29.99,
      postalAddress: postal,
    })
    expect(rendered.from).toBe(`"${GMAIL_FROM_DISPLAY_NAME}" <${GMAIL_TEST_FROM}>`)
    expect(rendered.subject).toBe('your Marietta listing preview')
    expect(rendered.subjectVariant === 'A' || rendered.subjectVariant === 'B').toBe(true)
    expect(rendered.text).toBe(`You probably get plenty of marketing pitches, so I'll keep this short. I set up a preview listing for Marietta Plumbing on QuickProList, a local directory where homeowners find pros and call them directly. No per-lead fees, no bidding, no middleman. Your preview is ready to look over (two minutes): ${enroll}
If you click start, it's live in search for 30 days, free, no card. After that it comes down on its own unless you choose $29.99/month, flat.
Guilherme, QuickProList
${GMAIL_AD_LINE} ${GMAIL_OPT_OUT_LINE} ${postal}`)
    expect(rendered.text.match(/https?:\/\/\S+/g)).toEqual([enroll])
    expect(rendered.text).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/)
  })

  it('says contact them directly when the listing has no phone, and still sends', () => {
    const rendered = renderGmailTestEmail({
      businessName: 'Ready Plumbing',
      email: 'owner@ready.example',
      city: 'atlanta',
      category: 'plumbing',
      enrollUrl: enroll,
      hasPhone: false,
      monthlyPrice: 29.99,
      postalAddress: '1 Test Street, Atlanta, GA 30301',
    })
    expect(rendered.text).toContain('homeowners find pros and contact them directly')
    expect(rendered.text).not.toContain('call them directly')
  })

  it('falls back to subject B when A would be longer than 4 words, and keeps a short A stable', () => {
    const longName = assignGmailSubject('Peppers Heating & Air Conditioning', 'a@example.com')
    expect(countWords('Peppers Heating & Air Conditioning preview')).toBeGreaterThan(4)
    expect(longName).toEqual({ variant: 'B', subject: GMAIL_SUBJECT_B })
    const again = assignGmailSubject('Ready Plumbing', 'owner@ready.example')
    expect(assignGmailSubject('Ready Plumbing', 'owner@ready.example')).toEqual(again)
    const variants = new Set<string>()
    for (let i = 0; i < 40; i += 1) variants.add(assignGmailSubject('Acme', `pro${i}@example.com`).variant)
    expect(variants).toEqual(new Set(['A', 'B']))
    expect(assignGmailSubject('Acme', 'a@example.com').subject).not.toBe('your Atlanta listing preview')
    const active = renderGmailTestEmail({
      businessName: 'Peppers Heating & Air Conditioning',
      email: 'a@example.com',
      city: 'atlanta',
      category: 'airconditioningheating',
      enrollUrl: enroll,
      postalAddress: '1 Test Street, Atlanta, GA 30301',
    })
    expect(active.subject).toBe('your Atlanta listing preview')
    expect(active.subjectVariant === 'A' || active.subjectVariant === 'B').toBe(true)
    expect(active.text).toContain(`${formatSubscriptionPrice()}/month`)
  })

  it('refuses to render a price other than the shared subscription price', () => {
    expect(() =>
      renderGmailTestEmail({
        businessName: 'Ready Plumbing',
        city: 'atlanta',
        category: 'plumbing',
        enrollUrl: enroll,
        postalAddress: '1 Test Street, Atlanta, GA 30301',
        monthlyPrice: 19.99,
      })
    ).toThrow(/29\.99/)
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
      claimsByEmail: claimsFor(prospects),
      generatedAt: '2026-10-17T00:00:00.000Z',
    })

    expect(batch.board).toBe('PAUSED')
    expect(batch.readyToSend).toBe(false)
    expect(batch.template.subject).toBe('your {city} listing preview')
    expect(batch.template.subjectA).toBe('{businessName} preview')
    expect(batch.template.subjectB).toBe('not a lead service')
    expect(batch.fromHeader).toBe('"Guilherme at QuickProList" <gui.quickprolist@gmail.com>')
    expect(batch.sendReady).toEqual([])
    expect(batch.held.map((row) => row.email)).toEqual(['owner@ready.example'])
    expect(batch.held[0]?.reason).toBe('missing_postal')
    expect(batch.held[0]?.text).toBeUndefined()
    expect(batch.flagged[0]?.text).toBeUndefined()
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
      claimsByEmail: claimsFor(prospects),
      generatedAt: '2026-10-17T00:00:00.000Z',
    })
    expect(batch.sendReady.map((row) => row.email)).toEqual(['owner@ready.example'])
    expect(batch.held).toEqual([])
    expect(batch.readyToSend).toBe(false)
    expect(batch.sendReady[0]?.text).toContain(postal)
    expect(batch.sendReady[0]?.text).not.toContain(POSTAL_ADDRESS_PLACEHOLDER)
    expect(batch.sendReady[0]?.text).toContain(GMAIL_OPT_OUT_LINE)
    expect(batch.sendReady[0]?.from).toBe('"Guilherme at QuickProList" <gui.quickprolist@gmail.com>')
  })

  it('treats the placeholder string as an unset postal address', () => {
    const batch = buildGmailTestBatch({
      prospects: [prospect({ businessName: 'Ready Plumbing', email: 'owner@ready.example' })],
      resend: [],
      gmail: [],
      mxByDomain: { 'ready.example': true },
      postalAddress: '{postalAddress}',
      claimsByEmail: { 'owner@ready.example': { monthlyPrice: 29.99 } },
    })
    expect(batch.sendReady).toEqual([])
    expect(batch.held).toHaveLength(1)
    expect(batch.held[0]?.reason).toBe('missing_postal')
    expect(batch.held[0]?.text).toBeUndefined()
  })

  it('excludes a suppressed address with reason suppressed, including a different case', () => {
    const batch = buildGmailTestBatch({
      prospects: [prospect({ businessName: 'Ready Plumbing', email: 'Owner@Ready.example' })],
      resend: [],
      gmail: [],
      mxByDomain: { 'ready.example': true },
      postalAddress: '1 Test Street, Atlanta, GA 30301',
      suppressedEmails: ['owner@ready.example'],
    })
    expect(batch.sendReady).toEqual([])
    expect(batch.held).toEqual([])
    expect(batch.excluded.map((row) => [row.email, row.reason])).toEqual([
      ['owner@ready.example', 'suppressed'],
    ])
  })
})

function invitationClaim(
  overrides: Partial<EnrollmentInvitation> & Pick<EnrollmentInvitation, 'contact_email' | 'monthly_price'>
): EnrollmentInvitation {
  return {
    id: 'inv-1',
    token: '22222222-2222-4222-8222-222222222222',
    business_name: 'Ready Plumbing',
    yelp_id: null,
    yelp_data: null,
    category: 'plumbing',
    cities: ['atlanta'],
    status: 'pending',
    stripe_session_id: null,
    stripe_subscription_id: null,
    curated_business_id: null,
    created_at: '2026-10-01T00:00:00.000Z',
    expires_at: '2099-01-01T00:00:00.000Z',
    canceled_at: null,
    trial_ends_at: null,
    ...overrides,
  }
}

describe('invitation claims for the Gmail batch', () => {
  it('passes the invitation price and phone, and still holds a mismatch or a missing postal address', () => {
    const claims = claimsByEmailFromInvitations([
      invitationClaim({
        contact_email: 'Owner@Ready.example',
        monthly_price: 29.99,
        yelp_data: { phone: ' 404-555-0100 ' },
        created_at: '2026-10-02T00:00:00.000Z',
      }),
      invitationClaim({
        id: 'older',
        contact_email: 'owner@ready.example',
        monthly_price: 19.99,
        yelp_data: { phone: '4045550199' },
        created_at: '2026-09-01T00:00:00.000Z',
      }),
      invitationClaim({
        id: 'other',
        token: '33333333-3333-4333-8333-333333333333',
        contact_email: 'other@example.com',
        monthly_price: 19.99,
        yelp_data: { phone: '4045550199' },
      }),
      invitationClaim({
        id: 'no-email',
        contact_email: null,
        monthly_price: 29.99,
        yelp_data: { phone: '4045550101' },
      }),
    ])

    expect(claims['owner@ready.example']).toEqual({ monthlyPrice: 29.99, phone: '404-555-0100' })
    expect(claims['other@example.com']).toEqual({ monthlyPrice: 19.99, phone: '4045550199' })
    expect(claims['']).toBeUndefined()

    const postal = '1 Test Street, Atlanta, GA 30301'
    const ready = prospect({ businessName: 'Ready Plumbing', email: 'owner@ready.example' })
    const matched = buildGmailTestBatch({
      prospects: [ready],
      resend: [],
      gmail: [],
      mxByDomain: { 'ready.example': true },
      postalAddress: postal,
      claimsByEmail: claims,
    })
    expect(matched.sendReady.map((row) => row.email)).toEqual(['owner@ready.example'])
    expect(matched.sendReady[0]?.text).toContain('call them directly')
    expect(matched.sendReady[0]?.text).toContain(`${formatSubscriptionPrice()}/month`)
    expect(matched.held).toEqual([])

    const mismatch = buildGmailTestBatch({
      prospects: [prospect({ businessName: 'Other Co', email: 'other@example.com' })],
      resend: [],
      gmail: [],
      mxByDomain: { 'example.com': true },
      postalAddress: postal,
      claimsByEmail: claims,
    })
    expect(mismatch.sendReady).toEqual([])
    expect(mismatch.held.map((row) => row.reason)).toEqual(['price_mismatch'])

    const noPostal = buildGmailTestBatch({
      prospects: [ready],
      resend: [],
      gmail: [],
      mxByDomain: { 'ready.example': true },
      claimsByEmail: claims,
    })
    expect(noPostal.sendReady).toEqual([])
    expect(noPostal.held.map((row) => row.reason)).toEqual(['missing_postal'])
    expect(noPostal.held[0]?.text).toBeUndefined()
  })
})

describe('Gmail claim checks', () => {
  it('renders ENROLL_PREVIEW_TRIAL_DAYS and falls back to 30', () => {
    const previous = process.env.ENROLL_PREVIEW_TRIAL_DAYS
    process.env.ENROLL_PREVIEW_TRIAL_DAYS = '  14  '
    const fourteen = renderGmailTestEmail({
      businessName: 'Ready Plumbing',
      city: 'atlanta',
      category: 'plumbing',
      enrollUrl: enroll,
      postalAddress: '1 Test Street, Atlanta, GA 30301',
    })
    expect(fourteen.text).toContain("it's live in search for 14 days, free, no card.")
    process.env.ENROLL_PREVIEW_TRIAL_DAYS = 'nope'
    const fallback = renderGmailTestEmail({
      businessName: 'Ready Plumbing',
      city: 'atlanta',
      category: 'plumbing',
      enrollUrl: enroll,
      postalAddress: '1 Test Street, Atlanta, GA 30301',
    })
    expect(fallback.text).toContain("it's live in search for 30 days, free, no card.")
    if (previous === undefined) delete process.env.ENROLL_PREVIEW_TRIAL_DAYS
    else process.env.ENROLL_PREVIEW_TRIAL_DAYS = previous
  })

  it('holds a row with price_mismatch when the invitation price is not 29.99', () => {
    const row = prospect({ businessName: 'Ready Plumbing', email: 'owner@ready.example' })
    for (const monthlyPrice of [19.99, null, '30']) {
      const batch = buildGmailTestBatch({
        prospects: [row],
        resend: [],
        gmail: [],
        mxByDomain: { 'ready.example': true },
        postalAddress: '1 Test Street, Atlanta, GA 30301',
        claimsByEmail: { 'owner@ready.example': { monthlyPrice } },
      })
      expect(batch.sendReady).toEqual([])
      expect(batch.held.map((held) => held.reason)).toEqual(['price_mismatch'])
    }
    const matched = buildGmailTestBatch({
      prospects: [row],
      resend: [],
      gmail: [],
      mxByDomain: { 'ready.example': true },
      postalAddress: '1 Test Street, Atlanta, GA 30301',
      claimsByEmail: { 'owner@ready.example': { monthlyPrice: '29.99', phone: '4045550100' } },
    })
    expect(matched.sendReady.map((ready) => ready.email)).toEqual(['owner@ready.example'])
    expect(matched.sendReady[0]?.text).toContain('call them directly')
    expect(matched.sendReady[0]?.subject).toBe('your Atlanta listing preview')
  })

  it('holds an unknown trade and still prepares a phoneless listing with contact wording', () => {
    const unknown = buildGmailTestBatch({
      prospects: [prospect({ businessName: 'Ready Plumbing', email: 'owner@ready.example', category: 'not-a-trade' })],
      resend: [],
      gmail: [],
      mxByDomain: { 'ready.example': true },
      postalAddress: '1 Test Street, Atlanta, GA 30301',
      claimsByEmail: { 'owner@ready.example': { monthlyPrice: 29.99, phone: '4045550100' } },
    })
    expect(unknown.sendReady).toEqual([])
    expect(unknown.held.map((row) => row.reason)).toEqual(['missing_category'])

    const noPhone = buildGmailTestBatch({
      prospects: [prospect({ businessName: 'Ready Plumbing', email: 'owner@ready.example' })],
      resend: [],
      gmail: [],
      mxByDomain: { 'ready.example': true },
      postalAddress: '1 Test Street, Atlanta, GA 30301',
      claimsByEmail: { 'owner@ready.example': { monthlyPrice: 29.99, phone: '   ' } },
    })
    expect(noPhone.sendReady).toHaveLength(1)
    expect(noPhone.sendReady[0]?.text).toContain('contact them directly')
    expect(noPhone.held.map((row) => row.reason)).not.toContain('missing_phone')
  })
})

describe('already listed prospects', () => {
  const ready = prospect({ businessName: 'Ready Plumbing', email: 'owner@ready.example', city: 'atlanta' })
  const postal = '1 Test Street, Atlanta, GA 30301'
  const base = {
    prospects: [ready],
    resend: [] as [],
    gmail: [] as [],
    mxByDomain: { 'ready.example': true },
    postalAddress: postal,
    claimsByEmail: { 'owner@ready.example': { monthlyPrice: 29.99, phone: '(404) 555-0100' } },
  }

  it('excludes an exact email, a normalized email, a normalized phone, and a normalized name plus city', () => {
    const byEmail = buildGmailTestBatch({
      ...base,
      listings: [{ name: 'Someone Else', city: 'marietta', email: 'owner@ready.example' }],
    })
    expect(byEmail.excluded.map((row) => row.reason)).toEqual(['already_listed'])

    const byEmailCase = buildGmailTestBatch({
      ...base,
      listings: [{ name: 'Someone Else', city: 'marietta', email: 'OWNER@READY.EXAMPLE' }],
    })
    expect(byEmailCase.excluded.map((row) => row.reason)).toEqual(['already_listed'])

    const byPhone = buildGmailTestBatch({
      ...base,
      listings: [{ name: 'Other Co', city: 'marietta', phone: '1-404-555-0100' }],
    })
    expect(byPhone.excluded.map((row) => row.reason)).toEqual(['already_listed'])

    const byName = buildGmailTestBatch({
      ...base,
      claimsByEmail: { 'owner@ready.example': { monthlyPrice: 29.99 } },
      listings: [{ name: 'Ready Plumbing & Heating', city: 'Atlanta, GA', email: 'other@example.com' }],
    })
    expect(byName.sendReady.map((row) => row.email)).toEqual(['owner@ready.example'])

    const byNameCity = buildGmailTestBatch({
      ...base,
      claimsByEmail: { 'owner@ready.example': { monthlyPrice: 29.99 } },
      listings: [{ name: 'ready   plumbing', city: 'Atlanta, GA', email: 'other@example.com' }],
    })
    expect(byNameCity.excluded.map((row) => row.reason)).toEqual(['already_listed'])
  })

  it('keeps a prospect who does not match a listing', () => {
    const batch = buildGmailTestBatch({
      ...base,
      listings: [{ name: 'Ready Plumbing', city: 'marietta', email: 'other@example.com', phone: '4045550199' }],
    })
    expect(batch.excluded).toEqual([])
    expect(batch.sendReady.map((row) => row.email)).toEqual(['owner@ready.example'])
  })

  it('sends only an allowed prospect source and skips the rest as disallowed_source', () => {
    const postal = '1 Test Street, Atlanta, GA 30301'
    const mxByDomain = { 'ready.example': true }
    for (const source of ['own_site', 'chamber', 'ga_sos', 'ga_license'] as const) {
      const batch = buildGmailTestBatch({
        prospects: [prospect({ businessName: 'Ready Plumbing', email: 'owner@ready.example', source })],
        resend: [],
        gmail: [],
        mxByDomain,
        postalAddress: postal,
        claimsByEmail: { 'owner@ready.example': { monthlyPrice: 29.99 } },
      })
      expect(batch.excluded).toEqual([])
      expect(batch.sendReady.map((row) => row.email)).toEqual(['owner@ready.example'])
    }

    for (const source of [undefined, null, '', '   ', 'Yelp', 'YELP', 'yelp', 'curated', 'manual']) {
      const batch = buildGmailTestBatch({
        prospects: [prospect({ businessName: 'Ready Plumbing', email: 'owner@ready.example', source })],
        resend: [],
        gmail: [],
        mxByDomain,
        postalAddress: postal,
        claimsByEmail: { 'owner@ready.example': { monthlyPrice: 29.99 } },
      })
      expect(batch.sendReady).toEqual([])
      expect(batch.held).toEqual([])
      expect(batch.excluded.map((row) => row.reason)).toEqual(['disallowed_source'])
    }
  })

  it('records suppressed when the address is both suppressed and from Yelp', () => {
    const batch = buildGmailTestBatch({
      prospects: [prospect({ businessName: 'Ready Plumbing', email: 'owner@ready.example', source: 'Yelp' })],
      resend: [],
      gmail: [],
      mxByDomain: { 'ready.example': true },
      postalAddress: '1 Test Street, Atlanta, GA 30301',
      claimsByEmail: { 'owner@ready.example': { monthlyPrice: 29.99 } },
      suppressedEmails: ['owner@ready.example'],
    })
    expect(batch.sendReady).toEqual([])
    expect(batch.excluded.map((row) => [row.email, row.reason])).toEqual([
      ['owner@ready.example', 'suppressed'],
    ])
  })

  it('records suppressed when the address is both suppressed and already listed', () => {
    const batch = buildGmailTestBatch({
      ...base,
      suppressedEmails: ['owner@ready.example'],
      listings: [{ name: 'Ready Plumbing', city: 'atlanta', email: 'owner@ready.example' }],
    })
    expect(batch.sendReady).toEqual([])
    expect(batch.excluded.map((row) => [row.email, row.reason])).toEqual([
      ['owner@ready.example', 'suppressed'],
    ])
  })
})

describe('Gmail reply opt-outs', () => {
  it.each([
    ['no', true],
    ['NO', true],
    ['  no  ', true],
    ['\nstop\n', true],
    ['  STOP  ', true],
    ['unsubscribe', true],
    ['  UnSubscribe  ', true],
    ['Please REMOVE me', true],
    ['remove me', true],
    ['not interested', true],
    ['Not Interested!', true],
    ['take me off your list', true],
    ["don't email me", true],
    ['do not email me', true],
    ['leave me alone', true],
    ['opt-out', true],
    ['no thanks', true],
    ['stop by the shop', true],
    ['no problem, call me', false],
    ['No Problem!', false],
    ['no worries, send the details', false],
    ['I know a plumber', false],
    ['another time', false],
    ['cannot make it', false],
  ])('classifies %j as opt-out=%s', (body, expected) => {
    expect(replyIsOptOut(body)).toBe(expected)
  })

  it('ignores the opt-out line when it is only in the quoted original', () => {
    const quoted = `Yes, call me\n\nOn Fri, Oct 17, 2026 at 1:00 PM Guilherme wrote:\n> Reply "no" and I won't email again.`
    expect(replyIsOptOut(quoted)).toBe(false)
    expect(replyIsOptOut(`not interested\n\n${quoted}`)).toBe(true)
  })

  it('records reply_opt_out for the sender and skips a non-opt-out', async () => {
    const added: Array<[string, string, string]> = []
    const result = await recordReplyOptOuts(
      [
        { fromEmail: 'Owner <Owner@Ready.example>', body: '  remove  ' },
        { fromEmail: 'owner@ready.example', body: 'remove me' },
        { fromEmail: 'Pat <pat@shop.example>', body: 'no problem, call me' },
      ],
      {
        addSuppression: async (channel, value, reason) => {
          added.push([channel, value, reason])
        },
      }
    )
    expect(result.suppressed).toEqual(['owner@ready.example'])
    expect(added).toEqual([['email', 'owner@ready.example', REPLY_OPT_OUT_REASON]])
    expect(result.ignored).toContain('pat@shop.example')
  })
})

describe('Gmail batch skip for trades outside the first test', () => {
  it('excludes Atlanta Green Maids and QuickPro Locksmith from every send bucket', () => {
    const registry = loadProspectRegistry()
    const names = ['Atlanta Green Maids', 'QuickPro Locksmith']
    const selected = registry.prospects.filter((row) => names.includes(row.businessName))
    expect(selected.map((row) => [row.businessName, row.status, row.skipReason])).toEqual([
      ['Atlanta Green Maids', 'skip', 'trade not in first test'],
      ['QuickPro Locksmith', 'skip', 'trade not in first test'],
    ])

    const claims: Record<string, { monthlyPrice: number }> = {}
    const mxByDomain: Record<string, boolean> = {}
    for (const row of registry.prospects) {
      if (!row.email) continue
      claims[row.email.trim().toLowerCase()] = { monthlyPrice: 29.99 }
      const domain = row.email.trim().toLowerCase().split('@')[1]
      if (domain) mxByDomain[domain] = true
    }

    const batch = buildGmailTestBatch({
      prospects: registry.prospects,
      resend: [],
      gmail: [],
      mxByDomain,
      postalAddress: '1 Test Street, Atlanta, GA 30301',
      claimsByEmail: claims,
      suppressedEmails: [],
      suppressionListLoaded: true,
      generatedAt: '2026-10-18T00:00:00.000Z',
    })

    const buckets = [...batch.sendReady, ...batch.held, ...batch.flagged, ...batch.needsEmail]
    for (const name of names) {
      expect(buckets.map((row) => row.business)).not.toContain(name)
      expect(batch.excluded.find((row) => row.business === name)?.reason).toBe('skipped')
    }
  })
})

describe('Gmail batch send order', () => {
  const postal = '1 Test Street, Atlanta, GA 30301'

  function batchFor(rows: ProspectRecord[], extra: Parameters<typeof buildGmailTestBatch>[0] = {
    prospects: rows,
    resend: [],
    gmail: [],
    mxByDomain: {},
    postalAddress: postal,
    claimsByEmail: claimsFor(rows),
    suppressedEmails: [],
    suppressionListLoaded: true,
    generatedAt: '2026-10-18T00:00:00.000Z',
  }) {
    const mxByDomain: Record<string, boolean> = { ...extra.mxByDomain }
    for (const row of rows) {
      const domain = row.email?.trim().toLowerCase().split('@')[1]
      if (domain && mxByDomain[domain] === undefined) mxByDomain[domain] = true
    }
    return buildGmailTestBatch({ ...extra, prospects: rows, mxByDomain })
  }

  it('sorts own-domain, then other company domains, then free mail, then approved roles', () => {
    const rows = [
      prospect({ businessName: 'Yahoo Second', email: 'second@yahoo.com', websiteUrl: 'https://yahoo-shop.example' }),
      prospect({ businessName: 'Own Second', email: 'pat@own-b.example', websiteUrl: 'https://own-b.example' }),
      prospect({ businessName: 'Role Held', email: 'info@held-role.example', websiteUrl: 'https://held-role.example' }),
      prospect({
        businessName: 'Approved Later',
        email: 'office@later.example',
        websiteUrl: 'https://later.example',
        roleAddressApproved: true,
        roleAddressNote: 'owner confirmed a small shop',
      }),
      prospect({ businessName: 'Own First', email: 'sam@own-a.example', websiteUrl: 'https://www.own-a.example' }),
      prospect({ businessName: 'Gmail First', email: 'first@gmail.com', websiteUrl: 'https://gmail-shop.example' }),
      prospect({
        businessName: 'Approved First',
        email: 'contact@first-role.example',
        websiteUrl: 'https://first-role.example',
        roleAddressApproved: true,
      }),
      prospect({ businessName: 'Other Domain', email: 'joe@other-mail.example', websiteUrl: 'https://different.example' }),
      prospect({ businessName: 'Comcast', email: 'shop@comcast.net', websiteUrl: 'https://comcast-shop.example' }),
      prospect({ businessName: 'Outlook', email: 'shop@outlook.com', websiteUrl: 'https://outlook-shop.example' }),
    ]
    const batch = batchFor(rows)
    expect(batch.sendReady.map((row) => [row.business, row.email])).toEqual([
      ['Own Second', 'pat@own-b.example'],
      ['Own First', 'sam@own-a.example'],
      ['Other Domain', 'joe@other-mail.example'],
      ['Yahoo Second', 'second@yahoo.com'],
      ['Gmail First', 'first@gmail.com'],
      ['Comcast', 'shop@comcast.net'],
      ['Outlook', 'shop@outlook.com'],
      ['Approved Later', 'office@later.example'],
      ['Approved First', 'contact@first-role.example'],
    ])
    expect(batch.sendReady.map((row) => row.roleAddress)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
    ])
    expect(batch.flagged.map((row) => row.email)).toEqual(['info@held-role.example'])
    expect(batch.sendReady.map((row) => row.email)).not.toContain('info@held-role.example')
    expect(batch.capPerDay).toBe(GMAIL_TEST_DAILY_CAP)
    expect(batch.capPerDay).toBe(5)
  })

  it('keeps suppressed, disallowed, listed, postal, price, and skip holds unchanged', () => {
    const rows = [
      prospect({ businessName: 'Ready', email: 'owner@ready-hold.example', websiteUrl: 'https://ready-hold.example' }),
      prospect({ businessName: 'Suppressed', email: 'owner@suppressed-hold.example' }),
      prospect({ businessName: 'Yelp Shop', email: 'owner@yelp-hold.example', source: 'yelp' }),
      prospect({ businessName: 'Listed Shop', email: 'owner@listed-hold.example' }),
      prospect({ businessName: 'Price Shop', email: 'owner@price-hold.example' }),
      prospect({ businessName: 'Skipped Shop', email: 'owner@skip-hold.example', status: 'skip' }),
      prospect({
        businessName: 'Approved Role',
        email: 'office@approved-hold.example',
        websiteUrl: 'https://approved-hold.example',
        roleAddressApproved: true,
      }),
    ]
    const claims = claimsFor(rows)
    claims['owner@price-hold.example'] = { monthlyPrice: 0 }
    const batch = batchFor(rows, {
      prospects: rows,
      resend: [],
      gmail: [],
      mxByDomain: {},
      postalAddress: postal,
      claimsByEmail: claims,
      suppressedEmails: ['owner@suppressed-hold.example'],
      suppressionListLoaded: true,
      listings: [{ name: 'Someone Else', city: 'atlanta', email: 'owner@listed-hold.example' }],
      generatedAt: '2026-10-18T00:00:00.000Z',
    })
    expect(batch.excluded.map((row) => [row.business, row.reason])).toEqual([
      ['Suppressed', 'suppressed'],
      ['Yelp Shop', 'disallowed_source'],
      ['Listed Shop', 'already_listed'],
      ['Skipped Shop', 'skipped'],
    ])
    expect(batch.held.map((row) => [row.business, row.reason])).toEqual([['Price Shop', 'price_mismatch']])
    expect(batch.sendReady.map((row) => row.business)).toEqual(['Ready', 'Approved Role'])

    const noPostal = batchFor(
      [
        prospect({ businessName: 'Needs Postal', email: 'owner@postal-hold.example', websiteUrl: 'https://postal-hold.example' }),
        prospect({
          businessName: 'Approved Needs Postal',
          email: 'office@postal-role.example',
          websiteUrl: 'https://postal-role.example',
          roleAddressApproved: true,
        }),
        prospect({ businessName: 'Role Needs Postal', email: 'info@postal-role-held.example' }),
      ],
      {
        prospects: [],
        resend: [],
        gmail: [],
        mxByDomain: {},
        claimsByEmail: claimsFor([
          { email: 'owner@postal-hold.example' },
          { email: 'office@postal-role.example' },
          { email: 'info@postal-role-held.example' },
        ]),
        suppressedEmails: [],
        suppressionListLoaded: true,
      }
    )
    expect(noPostal.sendReady).toEqual([])
    expect(noPostal.held.map((row) => [row.business, row.reason])).toEqual([
      ['Needs Postal', 'missing_postal'],
      ['Approved Needs Postal', 'missing_postal'],
    ])
    expect(noPostal.flagged.map((row) => [row.business, row.reason])).toEqual([
      ['Role Needs Postal', 'missing_postal'],
    ])
  })

  it('orders the real registry as own-domain, then free mail, then Pell and ITS', () => {
    const registry = loadProspectRegistry()
    const sent = loadSentRegistry()
    const claims = claimsFor(registry.prospects)
    const batch = batchFor(registry.prospects, {
      prospects: registry.prospects,
      resend: sent.sent,
      gmail: [],
      mxByDomain: {},
      postalAddress: postal,
      claimsByEmail: claims,
      suppressedEmails: [],
      suppressionListLoaded: true,
      generatedAt: '2026-10-18T00:00:00.000Z',
    })
    const ordered = batch.sendReady.map((row) => {
      const prospect = registry.prospects.find((item) => item.businessName === row.business)
      return [
        row.business,
        row.email,
        gmailSendReadyGroup({
          email: row.email ?? '',
          websiteUrl: prospect?.websiteUrl,
          roleAddressApproved: prospect?.roleAddressApproved,
        }),
      ]
    })
    expect(ordered).toEqual([
      ['Happy HVAC Solutions', 'zach@happyhvacsolutions.com', 'own-domain'],
      ['Maguire Electric', 'mike@maguireelectric.com', 'own-domain'],
      ['Elevated Roofing and Remodeling', 'creece@elevatedimprovements.com', 'own-domain'],
      ['Paramount Plumbing', 'paramount@paraplumbing.com', 'other-domain'],
      ['Build From Above Roofing', 'shawn@buildfromabove.com', 'other-domain'],
      ['Batylin Plumbing', 'batylinplumbing@comcast.net', 'free-mail'],
      ['The Clog Dawg Plumbing & Hydrojetting', 'theclogdawg@gmail.com', 'free-mail'],
      ['Braves City Plumbing', 'bravescityplumbing@gmail.com', 'free-mail'],
      ['Specialty Plumbing and Drain', 'specialtydrain@yahoo.com', 'free-mail'],
      ['Genesis Electric Services', 'genesiselectric2018@gmail.com', 'free-mail'],
      ['Four Seasons Roofing and Repair', 'fsrrinc@gmail.com', 'free-mail'],
      ['Pell Plumbing', 'office@pellplumbing.com', 'approved-role'],
      ['Integrated Trusted Solutions (ITS by Jay)', 'contact@itsbyjay.com', 'approved-role'],
    ])
    expect(batch.capPerDay).toBe(5)
    const day = planGmailDay([], batch.sendReady.map((row) => row.email))
    expect(day.scheduled).toEqual(batch.sendReady.slice(0, 5).map((row) => row.email))
    expect(day.deferred).toHaveLength(batch.sendReady.length - 5)

    const skippedRoles = [
      'Atlanta Tankless and Water Heater',
      'Electric Company',
      'AP Comfort',
      'Infinity Roofing',
      'Edwards Heating & Air',
      'Belco Electric',
    ]
    for (const name of skippedRoles) {
      expect(registry.prospects.find((row) => row.businessName === name)).toMatchObject({
        status: 'skip',
        skipReason: 'role address: shop size unverified or larger office',
      })
      expect(batch.excluded.find((row) => row.business === name)?.reason).toBe('skipped')
      expect(batch.sendReady.map((row) => row.business)).not.toContain(name)
      expect(batch.flagged.map((row) => row.business)).not.toContain(name)
    }
    expect(registry.prospects.find((row) => row.businessName === 'Pell Plumbing')?.roleAddressApproved).toBe(true)
    expect(registry.prospects.find((row) => row.email === 'contact@itsbyjay.com')?.roleAddressApproved).toBe(true)
  })
})
