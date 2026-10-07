// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

vi.mock('next/navigation', () => ({ usePathname: () => '/', useSearchParams: () => new URLSearchParams() }))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}))

const { nextAuthAuth } = vi.hoisted(() => ({
  nextAuthAuth: vi.fn(() => {
    throw new Error('auth() must not run without auth env')
  }),
}))
vi.mock('next-auth', () => ({ default: () => ({ handlers: {}, auth: nextAuthAuth }) }))
vi.mock('next-auth/providers/google', () => ({ default: () => ({}) }))

import SiteNav from './SiteNav'
import HomePage from '@/app/page'

const AUTH_ENV = ['AUTH_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'DATABASE_URL']

beforeEach(() => {
  for (const key of AUTH_ENV) vi.stubEnv(key, '')
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('with no auth or database env (real lib/auth)', () => {
  it('SiteNav fails safe to isAdmin=false without throwing', async () => {
    render(await SiteNav())
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Search' })).toBeTruthy()
    expect(nextAuthAuth).not.toHaveBeenCalled()
  })

  it('the public home page still renders', () => {
    render(<HomePage />)
    expect(document.body.textContent?.length).toBeGreaterThan(0)
  })
})
