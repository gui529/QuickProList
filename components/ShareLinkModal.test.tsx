// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import ShareLinkModal from './ShareLinkModal'

describe('ShareLinkModal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does not leak the "copied" state across a close/reopen within the timeout window', async () => {
    const onClose = vi.fn()

    const { rerender } = render(
      <ShareLinkModal open city="austin, tx" category="plumber" onClose={onClose} />
    )

    const copyButton = screen.getByRole('button', { name: /copy link/i })
    expect(copyButton.textContent).toBe('Copy link')

    // Click "Copy link" — button should flip to the copied state.
    await act(async () => {
      fireEvent.click(copyButton)
    })
    expect(screen.getByRole('button', { name: /copied/i }).textContent).toBe('✓ Copied')

    // Close the modal before the 1500ms reset timeout elapses.
    rerender(<ShareLinkModal open={false} city="austin, tx" category="plumber" onClose={onClose} />)

    // Reopen well within the original timeout window.
    rerender(<ShareLinkModal open city="austin, tx" category="plumber" onClose={onClose} />)

    expect(screen.getByRole('button', { name: /copy link/i }).textContent).toBe('Copy link')
  })
})
