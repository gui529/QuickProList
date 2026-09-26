import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the Supabase client so we can test lib/listing-requests.ts's real
// camelCase -> snake_case field mapping (not just a wholesale mock of
// createListingRequest) without a live Supabase project.
const { insertMock, singleMock, selectMock, fromMock, createClientMock } = vi.hoisted(() => {
  const singleMock = vi.fn().mockResolvedValue({ data: { id: 'request-1' }, error: null })
  const selectMock = vi.fn(() => ({ single: singleMock }))
  const insertMock = vi.fn(() => ({ select: selectMock }))
  const fromMock = vi.fn(() => ({ insert: insertMock }))
  const createClientMock = vi.fn(() => ({ from: fromMock }))
  return { insertMock, singleMock, selectMock, fromMock, createClientMock }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
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
    insertMock.mockClear()
    selectMock.mockClear()
    singleMock.mockClear()
    fromMock.mockClear()
    createClientMock.mockClear()
    process.env.SUPABASE_URL = 'https://example.test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('maps camelCase input to the snake_case columns of business_listing_requests', async () => {
    await createListingRequest(fullInput)

    expect(fromMock).toHaveBeenCalledWith('business_listing_requests')
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(insertMock).toHaveBeenCalledWith({
      business_name: 'Acme Plumbing',
      contact_name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-1234',
      category: 'plumbing',
      zip: '78701',
      message: 'Please list us!',
    })
  })

  it('maps optional phone/message to null when omitted', async () => {
    const { phone, message, ...rest } = fullInput
    void phone
    void message

    await createListingRequest(rest)

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null, message: null })
    )
  })

  it('returns null without touching Supabase when it is not configured', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const result = await createListingRequest(fullInput)

    expect(result).toBeNull()
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('throws when Supabase reports an error', async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: new Error('boom') })

    await expect(createListingRequest(fullInput)).rejects.toThrow('Failed to record listing request')
  })
})
