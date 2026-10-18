import { describe, expect, it, afterEach } from 'vitest'
import { isPreviewPagesEnabled, isProDashboardEnabled } from './feature-flags'

describe('isProDashboardEnabled', () => {
  afterEach(() => {
    delete process.env.PRO_DASHBOARD_ENABLED
  })

  it('is off when unset', () => {
    expect(isProDashboardEnabled()).toBe(false)
  })

  it('is on for true/1/yes', () => {
    process.env.PRO_DASHBOARD_ENABLED = 'true'
    expect(isProDashboardEnabled()).toBe(true)
    process.env.PRO_DASHBOARD_ENABLED = '1'
    expect(isProDashboardEnabled()).toBe(true)
    process.env.PRO_DASHBOARD_ENABLED = 'yes'
    expect(isProDashboardEnabled()).toBe(true)
  })
})

describe('isPreviewPagesEnabled', () => {
  afterEach(() => {
    delete process.env.PREVIEW_PAGES_ENABLED
  })

  it('is off when unset, including production', () => {
    expect(isPreviewPagesEnabled()).toBe(false)
    process.env.PREVIEW_PAGES_ENABLED = 'false'
    expect(isPreviewPagesEnabled()).toBe(false)
  })

  it('is on for true/1/yes', () => {
    process.env.PREVIEW_PAGES_ENABLED = 'true'
    expect(isPreviewPagesEnabled()).toBe(true)
    process.env.PREVIEW_PAGES_ENABLED = '1'
    expect(isPreviewPagesEnabled()).toBe(true)
    process.env.PREVIEW_PAGES_ENABLED = 'yes'
    expect(isPreviewPagesEnabled()).toBe(true)
  })
})
