import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn<(...args: unknown[]) => Promise<unknown[]>>(async () => []),
}))

vi.mock('./db', () => ({
  isDatabaseConfigured: () => Boolean(process.env.DATABASE_URL),
  query: (...args: unknown[]) => queryMock(...args),
}))

import {
  DEFAULT_PREVIEW_TTL_DAYS,
  assertDevPreviewBaseUrl,
  createPreviewToken,
  fillPreviewUrlPlaceholder,
  generatePreviewToken,
  isPreviewExpired,
  isPreviewTokenFormat,
  markPreviewOptedOut,
  mintDistinctPreviewTokens,
  previewExpiresAt,
  previewUrlForToken,
  recordPreviewView,
  sanitizePreviewRef,
  shouldCountPreviewView,
} from './preview-tokens'

describe('preview tokens', () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue([])
    process.env.DATABASE_URL = 'postgres://test'
    delete process.env.PREVIEW_TOKEN_TTL_DAYS
  })

  afterEach(() => {
    delete process.env.DATABASE_URL
    delete process.env.PREVIEW_TOKEN_TTL_DAYS
  })

  it('mints 128-bit url-safe tokens that are unique', () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const token = generatePreviewToken()
      expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/)
      expect(Buffer.from(token, 'base64url')).toHaveLength(16)
      tokens.add(token)
    }
    expect(tokens.size).toBe(50)
    expect(isPreviewTokenFormat(generatePreviewToken())).toBe(true)
  })

  it('rejects UUIDs and other non-token strings before they can hit the database', () => {
    expect(isPreviewTokenFormat('not-a-real-token')).toBe(false)
    expect(isPreviewTokenFormat('550e8400-e29b-41d4-a716-446655440000')).toBe(false)
    expect(isPreviewTokenFormat("'; DROP TABLE preview_tokens;--")).toBe(false)
    expect(isPreviewTokenFormat('')).toBe(false)
  })

  it('treats a past expires_at as expired and a null expires_at as open', () => {
    const now = Date.parse('2026-10-18T00:00:00Z')
    expect(isPreviewExpired(new Date(now - 1000).toISOString(), now)).toBe(true)
    expect(isPreviewExpired(new Date(now + 1000).toISOString(), now)).toBe(false)
    expect(isPreviewExpired(null, now)).toBe(false)
    expect(isPreviewExpired('not-a-date', now)).toBe(true)
  })

  it('defaults expiry to 60 days and honors PREVIEW_TOKEN_TTL_DAYS', () => {
    const from = new Date('2026-01-01T00:00:00Z')
    const def = previewExpiresAt(from)
    expect(def.getTime() - from.getTime()).toBe(DEFAULT_PREVIEW_TTL_DAYS * 24 * 60 * 60 * 1000)
    process.env.PREVIEW_TOKEN_TTL_DAYS = '14'
    const custom = previewExpiresAt(from)
    expect(custom.getTime() - from.getTime()).toBe(14 * 24 * 60 * 60 * 1000)
  })

  it('keeps a short ref and drops anything else', () => {
    expect(sanitizePreviewRef(' email1 ')).toBe('email1')
    expect(sanitizePreviewRef('followup')).toBe('followup')
    expect(sanitizePreviewRef('gmail-acme')).toBe('gmail-acme')
    expect(sanitizePreviewRef('<script>')).toBeNull()
    expect(sanitizePreviewRef('a'.repeat(65))).toBeNull()
    expect(sanitizePreviewRef('')).toBeNull()
    expect(sanitizePreviewRef(undefined)).toBeNull()
  })

  it('skips HEAD requests and known link-scanner user agents', () => {
    expect(shouldCountPreviewView({ method: 'GET', userAgent: 'Mozilla/5.0' })).toBe(true)
    expect(shouldCountPreviewView({ method: 'HEAD', userAgent: 'Mozilla/5.0' })).toBe(false)
    expect(shouldCountPreviewView({ method: 'GET', userAgent: 'Slackbot-LinkExpanding 1.0' })).toBe(false)
    expect(shouldCountPreviewView({ purpose: 'prefetch', userAgent: 'Mozilla/5.0' })).toBe(false)
  })

  it('updates only the preview token view counter', async () => {
    await recordPreviewView('AbCdEfGhIjKlMnOpQrStUv', { ref: 'email1', userAgent: 'Mozilla/5.0' })
    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]]
    expect(sql).toContain('view_count = view_count + 1')
    expect(sql).toContain('first_viewed_at = COALESCE(first_viewed_at, NOW())')
    expect(sql).toContain('last_ref')
    expect(sql).not.toMatch(/profile_views|phone_clicks|search_impressions|curated_businesses/i)
    expect(sql).not.toMatch(/\bINSERT\b/i)
    expect(params).toEqual(['AbCdEfGhIjKlMnOpQrStUv', 'email1', 'Mozilla/5.0'])
  })

  it('does not record a view for a non-token', async () => {
    await recordPreviewView('not-a-real-token', { ref: 'email1' })
    await recordPreviewView('550e8400-e29b-41d4-a716-446655440000', { ref: 'email1' })
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('inserts a preview token row and nothing else', async () => {
    const token = await createPreviewToken({
      recipientEmail: 'Owner@Geek.example',
      prospectId: '11111111-1111-1111-1111-111111111111',
      invitationToken: '22222222-2222-2222-2222-222222222222',
    })
    expect(isPreviewTokenFormat(token)).toBe(true)
    const [sql, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]]
    expect(sql).toMatch(/INSERT INTO preview_tokens/i)
    expect(sql).not.toMatch(/curated_businesses/i)
    expect(params?.[4]).toBe('owner@geek.example')
  })

  it('marks opted_out_at for the matching email only', async () => {
    queryMock.mockResolvedValueOnce([{ token: 'AbCdEfGhIjKlMnOpQrStUv' }])
    const ok = await markPreviewOptedOut('AbCdEfGhIjKlMnOpQrStUv', 'Owner@Geek.example')
    expect(ok).toBe(true)
    const [sql, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]]
    expect(sql).toContain('opted_out_at')
    expect(sql).not.toMatch(/curated_businesses|profile_views/i)
    expect(params).toEqual(['AbCdEfGhIjKlMnOpQrStUv', 'owner@geek.example'])
  })
})

describe('preview URL placeholders', () => {
  it('fills {previewUrl} with a dev base and a distinct token per recipient', () => {
    const emails = ['geek@example.com', 'other@example.com']
    const tokens = mintDistinctPreviewTokens(emails)
    expect(tokens.size).toBe(2)
    expect(tokens.get('geek@example.com')).not.toBe(tokens.get('other@example.com'))

    const base = 'https://dev.quickprolist.com'
    const template = 'Look: {previewUrl}\nEnroll stays {enrollUrl}'
    for (const email of emails) {
      const url = previewUrlForToken(base, tokens.get(email)!)
      expect(url.startsWith('https://dev.quickprolist.com/preview/')).toBe(true)
      const filled = fillPreviewUrlPlaceholder(template, url)
      expect(filled).toContain(url)
      expect(filled).toContain('{enrollUrl}')
      expect(filled).not.toContain('{previewUrl}')
    }
  })

  it('refuses to mint a production preview URL', () => {
    expect(() => assertDevPreviewBaseUrl('https://www.quickprolist.com')).toThrow(/production/)
    expect(() => assertDevPreviewBaseUrl('https://quickprolist.com/preview')).toThrow(/production/)
    expect(assertDevPreviewBaseUrl('https://dev.quickprolist.com/')).toBe('https://dev.quickprolist.com')
  })
})
