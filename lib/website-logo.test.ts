import { describe, expect, it } from 'vitest'
import { extractLogoCandidates, normalizeWebsiteUrl } from './website-logo'

describe('normalizeWebsiteUrl', () => {
  it('adds https and rejects localhost', () => {
    expect(normalizeWebsiteUrl('example.com')).toBe('https://example.com/')
    expect(normalizeWebsiteUrl('http://localhost/x')).toBeNull()
  })
})

describe('extractLogoCandidates', () => {
  it('prefers og:image then icons', () => {
    const html = `
      <meta property="og:image" content="https://cdn.example.com/hero.jpg" />
      <link rel="icon" href="/favicon.ico" />
    `
    const urls = extractLogoCandidates(html, 'https://www.acme.com/')
    expect(urls[0]).toBe('https://cdn.example.com/hero.jpg')
    expect(urls[1]).toBe('https://www.acme.com/favicon.ico')
  })
})
