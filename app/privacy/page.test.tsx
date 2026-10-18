// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PrivacyPage from './page'

describe('Privacy Policy', () => {
  afterEach(() => cleanup())

  it('uses the paid-listing wording and does not say featured', () => {
    render(<PrivacyPage />)
    const text = (document.body.textContent ?? '').replace(/\s+/g, ' ')
    expect(text).toContain('lets those businesses pay to be listed (paid listings are labeled "Sponsored")')
    expect(text).toContain(
      'Search results show businesses we have added to our directory, stored in our database. Some listings were first created from publicly available business information from third-party sources, including online directories. We do not receive live data from those sources.'
    )
    expect(text).toContain('Business owners with a paid listing')
    expect(text).toContain('When a business enrolls in a paid listing')
    expect(text).toContain('invite them to a paid listing')
    expect(text).toContain('Process paid listing subscriptions through Stripe.')
    expect(text).toContain(
      'Subscribers: cancel anytime online using the cancellation link in your subscription confirmation email, the Manage billing button on your dashboard (when available), or by emailing us.'
    )
    expect(text).not.toMatch(/featured/i)
  })
})
