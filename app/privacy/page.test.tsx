// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import PrivacyPage from './page'
import { PUBLIC_CONTACT_EMAIL } from '@/lib/site-contact'

describe('PrivacyPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders production privacy policy content', () => {
    render(<PrivacyPage />)

    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeDefined()
    expect(screen.queryByText(/pending legal review/i)).toBeNull()
    expect(screen.getAllByRole('link', { name: PUBLIC_CONTACT_EMAIL }).length).toBeGreaterThan(0)
    expect(screen.getByText(/Neon/)).toBeDefined()
  })
})
