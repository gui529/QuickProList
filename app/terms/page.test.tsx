// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import TermsPage from './page'
import { PUBLIC_CONTACT_EMAIL } from '@/lib/site-contact'

describe('TermsPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders production terms content', () => {
    render(<TermsPage />)

    expect(screen.getByRole('heading', { name: /terms of service/i })).toBeDefined()
    expect(screen.queryByText(/pending legal review/i)).toBeNull()
    expect(screen.getByText(/State of Georgia/)).toBeDefined()
    expect(screen.getAllByRole('link', { name: PUBLIC_CONTACT_EMAIL }).length).toBeGreaterThan(0)
  })
})
