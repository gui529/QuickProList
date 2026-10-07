// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'

const signIn = vi.fn()
vi.mock('next-auth/react', () => ({ signIn: (...args: unknown[]) => signIn(...args) }))

import LoginForm from './LoginForm'
import LoginPage from './page'

afterEach(() => {
  cleanup()
  signIn.mockReset()
})

describe('LoginForm', () => {
  it('offers Sign in with Google and no magic link form', () => {
    render(<LoginForm />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /magic link/i })).toBeNull()
    expect(screen.queryByPlaceholderText(/@/)).toBeNull()
  })

  it('starts the Google flow and lands on /admin afterwards', async () => {
    signIn.mockResolvedValue(undefined)
    render(<LoginForm />)
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }))
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('google', { redirectTo: '/admin' }))
  })

  it('shows the reason above the button after a bounce', () => {
    render(<LoginForm initialError="That Google account is not on the admin list." />)
    expect(screen.getByRole('alert').textContent).toMatch(/not on the admin list/)
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeTruthy()
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

  it('shows an Auth.js error code', async () => {
    expect(await html('AccessDenied')).toMatch(/not approved/)
  })

  it('uses the first value when error is repeated', async () => {
    expect(await html(['not_an_admin', 'x'])).toMatch(/not on the admin list/)
  })

  it('renders no alert without an error', async () => {
    expect(await html(undefined)).not.toMatch(/role="alert"/)
  })
})
