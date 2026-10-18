// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import EnrollmentLinkModal from './EnrollmentLinkModal'
import type { Business } from '@/lib/business'

const business: Business = {
  id: 'cur-1',
  source: 'manual',
  name: 'Acme Plumbing',
  rating: null,
  reviewCount: null,
  phone: '',
  address: '',
  imageUrl: '',
  url: '',
  categories: [],
  cities: ['Marietta'],
  category: 'plumbing',
  contactEmail: 'owner@acme.example',
}

describe('EnrollmentLinkModal', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('passes the prospect email when creating an enroll link', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ token: 'tok-1' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<EnrollmentLinkModal open onClose={() => {}} business={business} defaultCategory="plumbing" />)

    fireEvent.click(screen.getByRole('button', { name: /generate link/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const init = fetchMock.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body))
    expect(body.contactEmail).toBe('owner@acme.example')
    expect(body.businessName).toBe('Acme Plumbing')
  })
})