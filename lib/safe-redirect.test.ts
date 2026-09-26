import { describe, it, expect } from 'vitest'
import { safeRedirectPath } from './safe-redirect'

describe('safeRedirectPath', () => {
  it('falls back for an absolute URL to another origin', () => {
    expect(safeRedirectPath('https://evil.com', '/admin')).toBe('/admin')
  })

  it('honors a same-origin relative path', () => {
    expect(safeRedirectPath('/admin/campaigns', '/admin')).toBe('/admin/campaigns')
  })

  it('rejects a protocol-relative URL', () => {
    expect(safeRedirectPath('//evil.com', '/admin')).toBe('/admin')
  })

  it('rejects a backslash protocol-relative variant', () => {
    expect(safeRedirectPath('/\\evil.com', '/admin')).toBe('/admin')
  })

  it('falls back for null/missing next', () => {
    expect(safeRedirectPath(null, '/admin')).toBe('/admin')
    expect(safeRedirectPath(undefined, '/admin')).toBe('/admin')
  })

  it('falls back for a path missing the leading slash', () => {
    expect(safeRedirectPath('admin/campaigns', '/admin')).toBe('/admin')
  })
})
