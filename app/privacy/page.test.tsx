// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import PrivacyPage from './page'

describe('PrivacyPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a heading and the pending-legal-review placeholder text', () => {
    render(<PrivacyPage />)

    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeDefined()
    expect(screen.getByText(/pending legal review/i)).toBeDefined()
    expect(screen.getByText(/#19/)).toBeDefined()
  })
})
