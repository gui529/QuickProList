import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { ReactElement, ReactNode } from 'react'
import type { Business } from '@/lib/business'
import { generatePreviewToken, type PreviewTokenRecord } from '@/lib/preview-tokens'

const {
  getActivePreviewMock,
  recordPreviewViewMock,
  loadPreviewListingMock,
  incrementProfileViewMock,
  publishCuratedMock,
  addCuratedManualMock,
  addCuratedFromYelpMock,
  sendLeadAlertMock,
  activateEnrollmentTrialMock,
  headersMock,
} = vi.hoisted(() => ({
  getActivePreviewMock: vi.fn(),
  recordPreviewViewMock: vi.fn(async () => {}),
  loadPreviewListingMock: vi.fn(),
  incrementProfileViewMock: vi.fn(async () => {}),
  publishCuratedMock: vi.fn(async () => {}),
  addCuratedManualMock: vi.fn(async () => {}),
  addCuratedFromYelpMock: vi.fn(async () => {}),
  sendLeadAlertMock: vi.fn(async () => {}),
  activateEnrollmentTrialMock: vi.fn(async () => ({})),
  headersMock: vi.fn(async () => new Headers({ 'user-agent': 'Mozilla/5.0' })),
}))

vi.mock('next/headers', () => ({ headers: () => headersMock() }))
vi.mock('next/image', () => ({
  default: (props: { alt?: string }) => <span>{props.alt}</span>,
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children?: ReactNode }) => <a href={href}>{children}</a>,
}))
vi.mock('@/components/TrackedContactLink', () => ({
  default: () => {
    throw new Error('preview pages must not render lead tracking')
  },
}))
vi.mock('@/lib/preview-tokens', async (orig) => {
  const actual = await orig<typeof import('@/lib/preview-tokens')>()
  return {
    ...actual,
    getActivePreview: getActivePreviewMock,
    recordPreviewView: recordPreviewViewMock,
  }
})
vi.mock('@/lib/preview-listing', async (orig) => {
  const actual = await orig<typeof import('@/lib/preview-listing')>()
  return { ...actual, loadPreviewListing: loadPreviewListingMock }
})
vi.mock('@/lib/kv', () => ({
  incrementProfileView: incrementProfileViewMock,
  publishCurated: publishCuratedMock,
  addCuratedManual: addCuratedManualMock,
  addCuratedFromYelp: addCuratedFromYelpMock,
  getCuratedById: vi.fn(),
}))
vi.mock('@/lib/lead-alerts', () => ({ sendLeadAlertEmail: sendLeadAlertMock }))
vi.mock('@/lib/enrollment-trial', () => ({ activateEnrollmentTrial: activateEnrollmentTrialMock }))

import PreviewPage, { generateMetadata, PREVIEW_BANNER_TEXT } from './page'
import { EXISTING_LISTING_NOTE } from '@/lib/preview-listing'
import { previewEnrollCta } from '@/lib/campaign-defaults'

const ENROLL = '33333333-3333-4333-8333-333333333333'

function geekBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: 'preview-prospect:prospect-1',
    source: 'manual',
    name: 'Geek Company',
    rating: null,
    reviewCount: null,
    phone: '7705550101',
    address: '',
    imageUrl: '',
    url: '',
    categories: ['Computer repair'],
    cities: ['Acworth'],
    category: 'Computer repair',
    websiteUrl: 'https://geek.example',
    ...overrides,
  }
}

function previewRecord(token: string, overrides: Partial<PreviewTokenRecord> = {}): PreviewTokenRecord {
  return {
    token,
    prospectId: 'prospect-1',
    curatedBusinessId: null,
    invitationToken: ENROLL,
    recipientEmail: 'geek@example.com',
    campaignId: null,
    createdAt: '2026-10-01T00:00:00Z',
    expiresAt: null,
    firstViewedAt: null,
    lastViewedAt: null,
    viewCount: 0,
    lastRef: null,
    lastUserAgent: null,
    optedOutAt: null,
    ...overrides,
  }
}

function walk(node: ReactNode, acc: { text: string[]; hrefs: string[] }) {
  if (node == null || typeof node === 'boolean') return
  if (typeof node === 'string' || typeof node === 'number') {
    acc.text.push(String(node))
    return
  }
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, acc))
    return
  }
  const el = node as ReactElement<{ children?: ReactNode; href?: string }>
  if (typeof el.type === 'function') {
    walk((el.type as (props: unknown) => ReactNode)(el.props), acc)
    return
  }
  if (typeof el.props?.href === 'string') acc.hrefs.push(el.props.href)
  if (el.props?.children !== undefined) walk(el.props.children, acc)
}

async function render(token: string, ref?: string) {
  const result = await PreviewPage({
    params: Promise.resolve({ token }),
    searchParams: Promise.resolve(ref ? { ref } : {}),
  })
  const acc = { text: [] as string[], hrefs: [] as string[] }
  walk(result, acc)
  return { text: acc.text.join(''), hrefs: acc.hrefs }
}

describe('contractor preview page', () => {
  let token: string

  beforeEach(() => {
    token = generatePreviewToken()
    process.env.PREVIEW_PAGES_ENABLED = 'true'
    process.env.UNSUBSCRIBE_SECRET = 'test-secret'
    delete process.env.CAMPAIGN_POSTAL_ADDRESS
    getActivePreviewMock.mockReset()
    recordPreviewViewMock.mockClear()
    loadPreviewListingMock.mockReset()
    incrementProfileViewMock.mockClear()
    publishCuratedMock.mockClear()
    addCuratedManualMock.mockClear()
    addCuratedFromYelpMock.mockClear()
    sendLeadAlertMock.mockClear()
    activateEnrollmentTrialMock.mockClear()
    headersMock.mockReset()
    headersMock.mockResolvedValue(new Headers({ 'user-agent': 'Mozilla/5.0' }))
    getActivePreviewMock.mockResolvedValue(previewRecord(token))
    loadPreviewListingMock.mockResolvedValue({
      business: geekBusiness(),
      existingListingNote: false,
      matchedListingIds: [],
    })
  })

  it('Scenario: Prospect opens their preview', async () => {
    const view = await render(token, 'email1')
    expect(view.text).toContain('Geek Company')
    expect(view.text).toContain('Computer repair')
    expect(view.text).toContain('(770) 555-0101')
    expect(view.text).toContain('Acworth')
    expect(view.text).toContain(PREVIEW_BANNER_TEXT)
    expect(recordPreviewViewMock).toHaveBeenCalledTimes(1)
    expect(recordPreviewViewMock).toHaveBeenCalledWith(token, {
      ref: 'email1',
      userAgent: 'Mozilla/5.0',
    })
  })

  it('Scenario: Unknown token', async () => {
    await expect(render('not-a-real-token')).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(getActivePreviewMock).not.toHaveBeenCalled()
    expect(recordPreviewViewMock).not.toHaveBeenCalled()
  })

  it('returns 404 for a UUID or other non-token without a 500', async () => {
    await expect(
      render('550e8400-e29b-41d4-a716-446655440000')
    ).rejects.toMatchObject({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })
    await expect(render("token'; DROP TABLE preview_tokens;--")).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(getActivePreviewMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the token is missing or expired', async () => {
    getActivePreviewMock.mockResolvedValue(null)
    await expect(render(token)).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(loadPreviewListingMock).not.toHaveBeenCalled()
    expect(recordPreviewViewMock).not.toHaveBeenCalled()
  })

  it('Scenario: Search engines are kept out', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ token }) })
    expect(meta.robots).toEqual({ index: false, follow: false })
  })

  it('Scenario: Prospect starts the free preview', async () => {
    const view = await render(token)
    const cta = previewEnrollCta()
    expect(view.text).toContain(cta.headline)
    expect(view.text).toContain(cta.detail)
    expect(view.hrefs).toContain(`/enroll/${ENROLL}`)
  })

  it('Scenario: Prospect opts out', async () => {
    const view = await render(token)
    expect(view.text).toContain("Not interested?")
    expect(view.text).toContain("Click here")
    const optOut = view.hrefs.find((href) => href.startsWith('/api/unsubscribe?'))
    expect(optOut).toBeTruthy()
    const url = new URL(optOut!, 'https://dev.quickprolist.com')
    expect(url.searchParams.get('preview')).toBe(token)
    expect(url.searchParams.get('token')).toBeTruthy()
  })

  it('Scenario: Production is untouched', async () => {
    delete process.env.PREVIEW_PAGES_ENABLED
    await expect(render(token)).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(getActivePreviewMock).not.toHaveBeenCalled()
    expect(recordPreviewViewMock).not.toHaveBeenCalled()
    expect(loadPreviewListingMock).not.toHaveBeenCalled()
  })

  it('viewing a preview creates no listing and records no leads', async () => {
    await render(token, 'email1')
    expect(incrementProfileViewMock).not.toHaveBeenCalled()
    expect(publishCuratedMock).not.toHaveBeenCalled()
    expect(addCuratedManualMock).not.toHaveBeenCalled()
    expect(addCuratedFromYelpMock).not.toHaveBeenCalled()
    expect(sendLeadAlertMock).not.toHaveBeenCalled()
    expect(activateEnrollmentTrialMock).not.toHaveBeenCalled()

    const source = readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
    expect(source).not.toMatch(/incrementProfileView|publishCurated|addCurated|activateEnrollmentTrial|sendLeadAlertEmail/)
    const viewSource = readFileSync(path.join(__dirname, '../../../components/ProSiteView.tsx'), 'utf8')
    expect(viewSource).not.toContain('incrementProfileView')
  })

  it('does not count a link-scanner fetch as a preview view', async () => {
    headersMock.mockResolvedValue(new Headers({ 'user-agent': 'Slackbot-LinkExpanding 1.0' }))
    await render(token, 'email1')
    expect(recordPreviewViewMock).not.toHaveBeenCalled()
  })

  it('hides a missing phone and shows the postal line only when configured', async () => {
    loadPreviewListingMock.mockResolvedValue({
      business: geekBusiness({ phone: '', websiteUrl: undefined }),
      existingListingNote: false,
      matchedListingIds: [],
    })
    const hidden = await render(token)
    expect(hidden.text).not.toContain('(770)')
    expect(hidden.text).not.toContain('Visit Website')
    expect(hidden.text).not.toMatch(/\d{5}/)
    expect(hidden.text).toContain('This is a promotional preview from QuickProList.')

    process.env.CAMPAIGN_POSTAL_ADDRESS = '1 Main St, Atlanta, GA 30301'
    const shown = await render(token)
    expect(shown.text).toContain('1 Main St, Atlanta, GA 30301')
    expect(shown.hrefs).toContain('/privacy')
    expect(shown.hrefs).toContain('/terms')
  })

  it('surfaces an existing listing match without creating another', async () => {
    loadPreviewListingMock.mockResolvedValue({
      business: geekBusiness(),
      existingListingNote: true,
      matchedListingIds: ['curated-existing'],
    })
    const view = await render(token)
    expect(view.text).toContain(EXISTING_LISTING_NOTE)
    expect(publishCuratedMock).not.toHaveBeenCalled()
    expect(addCuratedManualMock).not.toHaveBeenCalled()
  })
})
