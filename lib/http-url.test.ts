import { describe, expect, it } from 'vitest'
import { httpUrlHref } from './http-url'

describe('httpUrlHref', () => {
  it('keeps http and https review URLs', () => {
    expect(httpUrlHref('https://g.page/r/example/review')).toBe('https://g.page/r/example/review')
    expect(httpUrlHref('http://reviews.example/acme')).toBe('http://reviews.example/acme')
  })

  it('refuses javascript:, tel:, and bare domains', () => {
    expect(httpUrlHref('javascript:alert(document.cookie)')).toBeNull()
    expect(httpUrlHref('java\nscript:alert(1)')).toBeNull()
    expect(httpUrlHref('\x1fjavascript:alert(1)')).toBeNull()
    expect(httpUrlHref('tel:+18436578901')).toBeNull()
    expect(httpUrlHref('g.page/r/example/review')).toBeNull()
    expect(httpUrlHref('')).toBeNull()
    expect(httpUrlHref(undefined)).toBeNull()
  })
})
