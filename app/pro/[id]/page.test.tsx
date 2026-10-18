import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import type { Business } from '@/lib/business'

const { getCuratedByIdMock, incrementProfileViewMock, listingProgramBusinessIdsMock } = vi.hoisted(() => ({
  getCuratedByIdMock: vi.fn(),
  incrementProfileViewMock: vi.fn(async () => {}),
  listingProgramBusinessIdsMock: vi.fn(async () => new Set<string>()),
}))

vi.mock('@/lib/kv', () => ({
  getCuratedById: getCuratedByIdMock,
  incrementProfileView: incrementProfileViewMock,
}))
vi.mock('@/lib/invitations', () => ({
  listingProgramBusinessIds: (...args: [string[]]) => listingProgramBusinessIdsMock(...args),
}))
vi.mock('@/components/ProSiteView', () => ({
  default: ({ business, trackContacts }: { business: Business; trackContacts: boolean }) => (
    <div>
      {business.name} track:{String(trackContacts)} sponsored:{String(Boolean(business.sponsored))}
    </div>
  ),
}))

import ProSitePage, { generateMetadata } from './page'

const LISTING_ID = '22222222-2222-4222-8222-222222222222'

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  const el = node as ReactElement<{ children?: ReactNode }>
  if (typeof el.type === 'function') return textOf((el.type as (props: unknown) => ReactNode)(el.props))
  if (el.props?.children !== undefined) return textOf(el.props.children)
  return ''
}

describe('ProSitePage', () => {
  beforeEach(() => {
    getCuratedByIdMock.mockReset()
    incrementProfileViewMock.mockClear()
    listingProgramBusinessIdsMock.mockReset()
    listingProgramBusinessIdsMock.mockResolvedValue(new Set())
  })

  it('still counts a profile view on the live listing', async () => {
    getCuratedByIdMock.mockResolvedValue({
      id: LISTING_ID,
      source: 'manual',
      name: 'Geek Company',
      phone: '7705550101',
      address: '',
      imageUrl: '',
      url: '',
      categories: ['Computer repair'],
      proSiteEnabled: true,
    })
    const result = await ProSitePage({ params: Promise.resolve({ id: LISTING_ID }) })
    expect(textOf(result)).toContain('Geek Company track:true')
    expect(incrementProfileViewMock).toHaveBeenCalledWith(LISTING_ID)
  })

  it('404s when the pro site is not published', async () => {
    getCuratedByIdMock.mockResolvedValue({
      id: LISTING_ID,
      name: 'Geek Company',
      proSiteEnabled: false,
    })
    await expect(ProSitePage({ params: Promise.resolve({ id: LISTING_ID }) })).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(incrementProfileViewMock).not.toHaveBeenCalled()
  })

  it.each(['abc', 'not-a-uuid'])('returns 404 for non-UUID id %s without a lookup', async (id) => {
    await expect(ProSitePage({ params: Promise.resolve({ id }) })).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    await expect(generateMetadata({ params: Promise.resolve({ id }) })).resolves.toEqual({
      title: 'QuickProList',
    })
    expect(getCuratedByIdMock).not.toHaveBeenCalled()
    expect(incrementProfileViewMock).not.toHaveBeenCalled()
  })

  it('returns 404 when a valid UUID matches no listing', async () => {
    getCuratedByIdMock.mockResolvedValue(null)
    const id = '11111111-1111-4111-8111-111111111111'
    await expect(ProSitePage({ params: Promise.resolve({ id }) })).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(getCuratedByIdMock).toHaveBeenCalledWith(id)
    expect(incrementProfileViewMock).not.toHaveBeenCalled()
  })

  it('marks a free preview and a paid listing-program pro as sponsored', async () => {
    getCuratedByIdMock.mockResolvedValue({
      id: LISTING_ID,
      source: 'manual',
      name: 'Preview Plumbing',
      phone: '',
      address: '',
      imageUrl: '',
      url: '',
      categories: [],
      proSiteEnabled: true,
      isTrial: true,
    })
    const preview = await ProSitePage({ params: Promise.resolve({ id: LISTING_ID }) })
    expect(textOf(preview)).toContain('sponsored:true')
    expect(listingProgramBusinessIdsMock).not.toHaveBeenCalled()

    listingProgramBusinessIdsMock.mockResolvedValue(new Set([LISTING_ID]))
    getCuratedByIdMock.mockResolvedValue({
      id: LISTING_ID,
      source: 'manual',
      name: 'Paid Plumbing',
      phone: '',
      address: '',
      imageUrl: '',
      url: '',
      categories: [],
      proSiteEnabled: true,
      isTrial: false,
    })
    const paid = await ProSitePage({ params: Promise.resolve({ id: LISTING_ID }) })
    expect(textOf(paid)).toContain('Paid Plumbing')
    expect(textOf(paid)).toContain('sponsored:true')
  })
})
