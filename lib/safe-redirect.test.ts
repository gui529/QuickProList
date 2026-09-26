// Uses Node's built-in test runner (`node --test`) rather than vitest, since
// this item isn't blocked on QPL-000 (vitest setup) — it's a pure function,
// verifiable in isolation. Run with: `node --test lib/safe-redirect.test.ts`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeRedirectPath } from './safe-redirect.ts'

test('falls back for an absolute URL to another origin', () => {
  assert.equal(safeRedirectPath('https://evil.com', '/admin'), '/admin')
})

test('honors a same-origin relative path', () => {
  assert.equal(safeRedirectPath('/admin/campaigns', '/admin'), '/admin/campaigns')
})

test('rejects a protocol-relative URL', () => {
  assert.equal(safeRedirectPath('//evil.com', '/admin'), '/admin')
})

test('rejects a backslash protocol-relative variant', () => {
  assert.equal(safeRedirectPath('/\\evil.com', '/admin'), '/admin')
})

test('falls back for null/missing next', () => {
  assert.equal(safeRedirectPath(null, '/admin'), '/admin')
  assert.equal(safeRedirectPath(undefined, '/admin'), '/admin')
})

test('falls back for a path missing the leading slash', () => {
  assert.equal(safeRedirectPath('admin/campaigns', '/admin'), '/admin')
})
