import { describe, expect, it, beforeEach, vi } from 'vitest'

const { createListingRequestMock, listListingRequestsMock } = vi.hoisted(() => ({
  createListingRequestMock: vi.fn().mockResolvedValue({ id: 'listing-1' }),
  listListingRequestsMock: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/listing-requests', () => ({
  createListingRequest: createListingRequestMock,
  listListingRequests: listListingRequestsMock,
}))

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({
  requireAdmin: requireAdminMock,
  AuthError: class AuthError extends Error {
    status: 401 | 403
    constructor(status: 401 | 403, message: string) {
      super(message)
      this.status = status
    }
  },
}))

import { POST, GET } from './route'
import { AuthError } from '@/lib/auth'

function makeRequest(body: unknown): Request {
  return new Request('https://example.test/api/list-business', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeGetRequest(): Request {
  return new Request('https://example.test/api/list-business', { method: 'GET' })
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

describe('GET /api/list-business', () => {
  beforeEach(() => {
    requireAdminMock.mockReset()
    listListingRequestsMock.mockClear()
  })

  it('returns 401 without admin auth', async () => {
    requireAdminMock.mockRejectedValue(new AuthError(401, 'Not signed in'))

    const res = await GET(makeGetRequest() as never)

    expect(res.status).toBe(401)
    expect(listListingRequestsMock).not.toHaveBeenCalled()
  })

  it('returns the list of listing requests with admin auth mocked', async () => {
    requireAdminMock.mockResolvedValue({ email: 'admin@test.com', userId: 'admin-1' })
    listListingRequestsMock.mockResolvedValue([
      { id: 'listing-1', business_name: 'Acme Plumbing', contact_name: 'Jane Doe', email: 'jane@example.com', phone: null, category: 'plumbing', zip: '78701', message: null, created_at: new Date().toISOString() },
    ])

    const res = await GET(makeGetRequest() as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.requests).toHaveLength(1)
    expect(data.requests[0].business_name).toBe('Acme Plumbing')
  })
})
