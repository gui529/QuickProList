import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the Supabase client so we can test lib/listing-requests.ts's real
// camelCase -> snake_case field mapping (not just a wholesale mock of
// createListingRequest) without a live Supabase project.
const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn().mockResolvedValue([{ id: 'request-1' }]),
}))

vi.mock('./db', () => ({
  isDatabaseConfigured: () => Boolean(process.env.DATABASE_URL),
  query: (...args: unknown[]) => queryMock(...args),
}))

import { createListingRequest, type ListingRequestInput } from './listing-requests'

const fullInput: ListingRequestInput = {
  businessName: 'Acme Plumbing',
  contactName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-1234',
  category: 'plumbing',
  zip: '78701',
  message: 'Please list us!',
}

describe('createListingRequest (lib/listing-requests.ts)', () => {
  beforeEach(() => {
    queryMock.mockClear()
    queryMock.mockResolvedValue([{ id: 'request-1' }])
    process.env.DATABASE_URL = 'postgres://test'
  })

  it('maps camelCase input to the snake_case columns of business_listing_requests', async () => {
    await createListingRequest(fullInput)

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('business_listing_requests'),
      [
        'Acme Plumbing',
        'Jane Doe',
        'jane@example.com',
        '555-1234',
        'plumbing',
        '78701',
        'Please list us!',
      ]
    )
  })

  it('maps optional phone/message to null when omitted', async () => {
    const { phone, message, ...rest } = fullInput
    void phone
    void message

    await createListingRequest(rest)

    expect(queryMock.mock.calls[0][1]).toEqual([
      'Acme Plumbing',
      'Jane Doe',
      'jane@example.com',
      null,
      'plumbing',
      '78701',
      null,
    ])
  })

  it('returns null without querying when the database is not configured', async () => {
    delete process.env.DATABASE_URL

    const result = await createListingRequest(fullInput)

    expect(result).toBeNull()
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('throws when the insert returns no row', async () => {
    queryMock.mockResolvedValueOnce([])

    await expect(createListingRequest(fullInput)).rejects.toThrow('Failed to record listing request')
  })
})
