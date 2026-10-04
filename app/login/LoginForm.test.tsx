// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/lib/supabase/browser', () => ({
  getBrowserSupabase: () => ({ auth: { signInWithOtp: vi.fn() } }),
}))

import LoginForm from './LoginForm'
import LoginPage from './page'

afterEach(cleanup)

describe('LoginForm', () => {
  it('shows no alert on a plain visit', () => {
    render(<LoginForm />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeTruthy()
  })

  it('shows the reason above the form after a bounce', () => {
    render(<LoginForm initialError="That email is not on the admin list." />)
    expect(screen.getByRole('alert').textContent).toMatch(/not on the admin list/)
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeTruthy()
  })
})

describe('LoginPage', () => {
  async function html(error: string | string[] | undefined) {
    const el = await LoginPage({ searchParams: Promise.resolve({ error }) })
    return renderToStaticMarkup(el)
  }

  it('turns ?error=not_an_admin into a visible message', async () => {
    expect(await html('not_an_admin')).toMatch(/not on the admin list/)
  })

  it('turns an exchange failure message into a visible message', async () => {
    expect(await html('PKCE code verifier not found in storage')).toMatch(/same browser/)
  })

  it('uses the first value when error is repeated', async () => {
    expect(await html(['missing_code', 'x'])).toMatch(/incomplete/)
  })

  it('renders no alert without an error', async () => {
    expect(await html(undefined)).not.toMatch(/role="alert"/)
  })
})
