// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

let authResult: () => Promise<{ email: string; userId: string } | null>

vi.mock('@/lib/auth', () => ({ getAdminSession: () => authResult() }))
vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

import SiteNav from './SiteNav'

async function renderNav() {
  render(await SiteNav())
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SiteNav Dashboard link', () => {
  it('shows Search and Admin, with Admin as the only link to the admin area', async () => {
    authResult = async () => ({ email: 'admin@example.com', userId: 'u1' })
    await renderNav()

    expect(screen.getByRole('link', { name: 'Search' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: 'Admin' }).getAttribute('href')).toBe('/admin')
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
  })

  it('hides Dashboard for a signed-in non-admin or signed-out visitor', async () => {
    authResult = async () => null
    await renderNav()

    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Search' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Admin' })).toBeTruthy()
  })

  it('hides Dashboard when the auth check fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    authResult = async () => {
      throw new Error('missing auth env')
    }
    await renderNav()

    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
    expect(console.error).toHaveBeenCalled()
  })
})
