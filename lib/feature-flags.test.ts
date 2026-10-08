import { describe, expect, it, afterEach } from 'vitest'
import { isProDashboardEnabled } from './feature-flags'

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
