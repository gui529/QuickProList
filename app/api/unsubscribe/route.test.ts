import { beforeEach, describe, expect, it, vi } from 'vitest'

const addSuppressionMock = vi.hoisted(() => vi.fn(async () => {}))
const markPreviewOptedOutMock = vi.hoisted(() => vi.fn(async () => true))
vi.mock('@/lib/suppressions', async (orig) => ({
  ...(await orig<typeof import('@/lib/suppressions')>()),
  addSuppression: addSuppressionMock,
}))
vi.mock('@/lib/preview-tokens', async (orig) => ({
  ...(await orig<typeof import('@/lib/preview-tokens')>()),
  markPreviewOptedOut: markPreviewOptedOutMock,
}))

import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { createUnsubscribeToken } from '@/lib/unsubscribe'

function legacyUnsubscribeToken(email: string): string {
  const payload = Buffer.from(email.trim().toLowerCase()).toString('base64url')
  const sig = createHmac('sha256', 'test-secret').update(payload).digest('base64url')
  return `${payload}.${sig}`
}

const req = (method: string, token: string, preview?: string) => {
  const url = new URL('https://example.test/api/unsubscribe')
  url.searchParams.set('token', token)
  if (preview) url.searchParams.set('preview', preview)
  return new NextRequest(url, { method })
}

describe('/api/unsubscribe', () => {
  beforeEach(() => {
    addSuppressionMock.mockClear()
    markPreviewOptedOutMock.mockClear()
    process.env.UNSUBSCRIBE_SECRET = 'test-secret'
  })

  it('GET confirm form keeps the preview token so unsubscribing opts the preview out', async () => {
    const preview = 'AAAAAAAAAAAAAAAAAAAAAA'
    const token = createUnsubscribeToken('owner@example.com')
    const res = await GET(req('GET', token, preview))
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain(`action="/api/unsubscribe?`)
    expect(html).toContain(`preview=${preview}`)
    expect(html).toContain(`token=${encodeURIComponent(token)}`)
    expect(addSuppressionMock).not.toHaveBeenCalled()
    expect(markPreviewOptedOutMock).not.toHaveBeenCalled()
  })

  it('GET shows a confirm page and does NOT unsubscribe', async () => {
    const res = await GET(req('GET', createUnsubscribeToken('a@example.com')))
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('a@example.com')
    expect(addSuppressionMock).not.toHaveBeenCalled()
  })

  it('POST suppresses the token\'s email', async () => {
    const res = await POST(req('POST', createUnsubscribeToken('A@Example.com')))
    expect(res.status).toBe(200)
    expect(addSuppressionMock).toHaveBeenCalledWith('email', 'a@example.com', 'unsubscribe')
    expect(markPreviewOptedOutMock).not.toHaveBeenCalled()
  })

  it('POST from a preview opt-out also marks that preview token', async () => {
    const preview = 'AAAAAAAAAAAAAAAAAAAAAA'
    const res = await POST(req('POST', createUnsubscribeToken('owner@example.com'), preview))
    expect(res.status).toBe(200)
    expect(await res.text()).toContain("You're unsubscribed.")
    expect(addSuppressionMock).toHaveBeenCalledWith('email', 'owner@example.com', 'unsubscribe')
    expect(markPreviewOptedOutMock).toHaveBeenCalledWith(preview, 'owner@example.com')
  })

  it('rejects forged tokens on both methods', async () => {
    expect((await GET(req('GET', 'x.y'))).status).toBe(400)
    expect((await POST(req('POST', 'x.y'))).status).toBe(400)
    expect(addSuppressionMock).not.toHaveBeenCalled()
  })

  it('old base64 links still unsubscribe on POST and keep &preview= on the confirm form', async () => {
    const preview = 'AAAAAAAAAAAAAAAAAAAAAA'
    const token = legacyUnsubscribeToken('Owner@Example.com')
    const getRes = await GET(req('GET', token, preview))
    expect(getRes.status).toBe(200)
    const html = await getRes.text()
    expect(html).toContain('owner@example.com')
    expect(html).toContain(`preview=${preview}`)
    expect(html).toContain(`token=${encodeURIComponent(token)}`)
    expect(addSuppressionMock).not.toHaveBeenCalled()

    const postRes = await POST(req('POST', token, preview))
    expect(postRes.status).toBe(200)
    expect(addSuppressionMock).toHaveBeenCalledWith('email', 'owner@example.com', 'unsubscribe')
    expect(markPreviewOptedOutMock).toHaveBeenCalledWith(preview, 'owner@example.com')
  })

  it('rejects a tampered new token and does not record a suppression', async () => {
    const token = createUnsubscribeToken('owner@example.com')
    const [version, id, sig] = token.split('.')
    const tampered = `${version}.${id}.${sig.slice(0, -1)}${sig.endsWith('a') ? 'b' : 'a'}`
    expect((await GET(req('GET', tampered))).status).toBe(400)
    expect((await POST(req('POST', tampered, 'AAAAAAAAAAAAAAAAAAAAAA'))).status).toBe(400)
    expect(addSuppressionMock).not.toHaveBeenCalled()
    expect(markPreviewOptedOutMock).not.toHaveBeenCalled()
  })
})
