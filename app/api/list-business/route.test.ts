import { describe, expect, it, beforeEach, vi } from 'vitest'

const { createListingRequestMock } = vi.hoisted(() => ({
  createListingRequestMock: vi.fn().mockResolvedValue({ id: 'listing-1' }),
}))
vi.mock('@/lib/listing-requests', () => ({
  createListingRequest: createListingRequestMock,
}))

import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('https://example.test/api/list-business', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validSubmission = {
  businessName: 'Acme Plumbing',
  contactName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-1234',
  category: 'plumbing',
  zip: '78701',
  message: 'Please list us!',
}

describe('POST /api/list-business', () => {
  beforeEach(() => {
    createListingRequestMock.mockClear()
  })

  it('persists the submission via createListingRequest with the submitted fields', async () => {
    const res = await POST(makeRequest(validSubmission) as never)

    expect(res.status).toBe(200)
    expect(createListingRequestMock).toHaveBeenCalledTimes(1)
    expect(createListingRequestMock).toHaveBeenCalledWith(validSubmission)
  })

  it('rejects a submission missing required fields without persisting it', async () => {
    const res = await POST(makeRequest({ ...validSubmission, businessName: '' }) as never)

    expect(res.status).toBe(400)
    expect(createListingRequestMock).not.toHaveBeenCalled()
  })

  it('still returns ok when persistence fails, so the submitter sees success', async () => {
    createListingRequestMock.mockRejectedValueOnce(new Error('supabase down'))

    const res = await POST(makeRequest(validSubmission) as never)

    expect(res.status).toBe(200)
    expect(createListingRequestMock).toHaveBeenCalledTimes(1)
  })
})
