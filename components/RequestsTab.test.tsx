// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import RequestsTab from './RequestsTab'
import type { ListingRequest } from '@/lib/listing-requests'

function makeRequest(overrides: Partial<ListingRequest> = {}): ListingRequest {
  return {
    id: 'listing-1',
    business_name: 'Acme Plumbing',
    contact_name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-1234',
    category: 'plumbing',
    zip: '78701',
    message: 'Please list us!',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('RequestsTab', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('lists at least one mocked listing request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.startsWith('/api/list-business')) {
          return Promise.resolve({ ok: true, json: async () => ({ requests: [makeRequest()] }) } as Response)
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      })
    )

    render(<RequestsTab />)

    await waitFor(() => {
      expect(screen.getByText('Acme Plumbing')).toBeTruthy()
    })

    expect(screen.getByText('Jane Doe')).toBeTruthy()
    expect(screen.getByText('jane@example.com')).toBeTruthy()
  })

  it('shows an empty state when there are no requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ requests: [] }) } as Response))
    )

    render(<RequestsTab />)

    await waitFor(() => {
      expect(screen.getByText('No listing requests yet.')).toBeTruthy()
    })
  })
})
