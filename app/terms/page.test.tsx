// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import TermsPage from './page'

describe('TermsPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a heading and the pending-legal-review placeholder text', () => {
    render(<TermsPage />)

    expect(screen.getByRole('heading', { name: /terms of service/i })).toBeDefined()
    expect(screen.getByText(/pending legal review/i)).toBeDefined()
    expect(screen.getByText(/#19/)).toBeDefined()
  })
})
