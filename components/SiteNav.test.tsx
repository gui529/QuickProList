// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

import SiteNav from './SiteNav'

async function renderNav() {
  render(await SiteNav())
}

afterEach(() => {
  cleanup()
})

describe('SiteNav', () => {
  it('shows Search and Admin links', async () => {
    await renderNav()

    expect(screen.getByRole('link', { name: 'Search' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: 'Admin' }).getAttribute('href')).toBe('/admin')
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
  })
})
