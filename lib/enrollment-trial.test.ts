import { describe, expect, it, beforeEach, vi } from 'vitest'

vi.mock('./invitations', () => import('./invitations.test-double'))
vi.mock('./kv', () => import('./kv.test-double'))
vi.mock('./email', () => ({
  sendEmail: vi.fn().mockResolvedValue('email-id'),
}))

import { sendEmail } from './email'
import { __reset as resetInvitations, __seed as seedInvitation, getInvitationByToken } from './invitations.test-double'
import { __reset as resetCurated, __all as allCurated, __seed as seedCurated } from './kv.test-double'
import {
  activateEnrollmentTrial,
  enrollPreviewTrialDays,
  EnrollmentTrialError,
} from './enrollment-trial'
import { formatPreviewEndDate } from './preview-date'

const sendEmailMock = vi.mocked(sendEmail)

describe('activateEnrollmentTrial', () => {
  beforeEach(() => {
    resetInvitations()
    resetCurated()
    sendEmailMock.mockClear()
    delete process.env.PRO_DASHBOARD_ENABLED
  })

  it('creates a live trial listing from a pending invitation', async () => {
    const inv = seedInvitation({
      token: 'tok-1',
      status: 'pending',
      business_name: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['marietta'],
      monthly_price: 29.99,
    })

    const result = await activateEnrollmentTrial(inv.token, 'owner@acme.test')

    expect(result.curatedBusinessId).toBeTruthy()
    expect(result.trialEndsAt).toBeTruthy()

    const curated = allCurated()
    expect(curated).toHaveLength(1)
    expect(curated[0].name).toBe('Acme Plumbing')
    expect(curated[0].is_trial).toBe(true)
    expect(curated[0].trial_ends_at).toBeTruthy()

    const updated = await getInvitationByToken('tok-1')
    expect(updated?.status).toBe('trial')
    expect(updated?.curated_business_id).toBe(result.curatedBusinessId)
    expect(curated[0].contact_email).toBe('owner@acme.test')

    const endLabel = formatPreviewEndDate(result.trialEndsAt)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const body = sendEmailMock.mock.calls[0][2]
    expect(body).toContain(endLabel)
    expect(body).toContain('Nothing is charged automatically.')
    expect(sendEmailMock.mock.calls[0][3]).toEqual({ kind: 'transactional' })
  })

  it('rejects a preview start with no reminder email and does not publish', async () => {
    seedInvitation({
      token: 'tok-email',
      status: 'pending',
      business_name: 'No Email Plumbing',
    })

    await expect(activateEnrollmentTrial('tok-email')).rejects.toMatchObject({
      code: 'email_required',
      message: 'Enter an email for preview reminders.',
    })
    expect(allCurated()).toHaveLength(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('rejects an invalid reminder email', async () => {
    seedInvitation({ token: 'tok-bad', status: 'pending' })
    await expect(activateEnrollmentTrial('tok-bad', 'not-an-email')).rejects.toMatchObject({
      message: 'Enter a valid email for preview reminders.',
    })
    expect(allCurated()).toHaveLength(0)
  })

  it('uses the invitation email when the request does not send one', async () => {
    const inv = seedInvitation({
      token: 'tok-prefill',
      status: 'pending',
      cities: ['marietta'],
      contact_email: 'stored@acme.test',
    })
    await activateEnrollmentTrial(inv.token)
    expect(allCurated()[0].contact_email).toBe('stored@acme.test')
    expect(sendEmailMock.mock.calls[0][0]).toBe('stored@acme.test')
  })

  it('copies phone, address, website, name, city, and trade onto the new listing', async () => {
    const inv = seedInvitation({
      token: 'tok-phone',
      status: 'pending',
      business_name: 'Acme Plumbing',
      category: 'plumbing',
      cities: ['marietta'],
      yelp_data: {
        name: 'Acme Plumbing',
        phone: '770-555-0142',
        address: '10 Main St, Marietta, GA',
        websiteUrl: 'https://acme.example',
        imageUrl: 'https://acme.example/logo.png',
      },
    })

    await activateEnrollmentTrial(inv.token, 'owner@acme.test')

    const created = allCurated().find((row) => row.name === 'Acme Plumbing')
    expect(created?.phone).toBe('770-555-0142')
    expect(created?.address).toBe('10 Main St, Marietta, GA')
    expect(created?.website_url).toBe('https://acme.example')
    expect(created?.image_url).toBe('https://acme.example/logo.png')
    expect(created?.category).toBe('plumbing')
    expect(created?.cities).toEqual(['marietta'])
  })

  it('leaves phone empty when the invitation has none', async () => {
    const inv = seedInvitation({
      token: 'tok-nophone',
      status: 'pending',
      business_name: 'No Phone Co',
      category: 'roofing',
      cities: ['kennesaw'],
      yelp_data: { name: 'No Phone Co', phone: '   ', address: '' },
    })

    await activateEnrollmentTrial(inv.token, 'nophone@acme.test')

    const created = allCurated().find((row) => row.name === 'No Phone Co')
    expect(created?.phone).toBeNull()
    expect(created?.address).toBeNull()
  })

  it('does not change an existing listing when a new preview is created', async () => {
    const existing = seedCurated({
      id: 'existing-1',
      name: 'Already Listed',
      phone: '404-555-0100',
      address: '1 Old Rd',
      category: 'electrical',
      cities: ['marietta'],
    })
    const inv = seedInvitation({
      token: 'tok-new',
      status: 'pending',
      business_name: 'New Preview Pro',
      category: 'plumbing',
      cities: ['marietta'],
      yelp_data: { phone: '678-555-0199' },
    })

    await activateEnrollmentTrial(inv.token, 'new@acme.test')

    const kept = allCurated().find((row) => row.id === existing.id)
    expect(kept?.phone).toBe('404-555-0100')
    expect(kept?.address).toBe('1 Old Rd')
    expect(kept?.name).toBe('Already Listed')
    expect(kept?.category).toBe('electrical')
    expect(allCurated().find((row) => row.name === 'New Preview Pro')?.phone).toBe('678-555-0199')
  })

  it('is idempotent when trial already started', async () => {
    seedInvitation({
      token: 'tok-2',
      status: 'trial',
      curated_business_id: 'cur-1',
      trial_ends_at: '2099-01-01T00:00:00.000Z',
    })

    const result = await activateEnrollmentTrial('tok-2')
    expect(result.curatedBusinessId).toBe('cur-1')
    expect(allCurated()).toHaveLength(0)
  })

  it('rejects preview when invitation already targets an existing listing', async () => {
    seedInvitation({
      token: 'tok-3',
      status: 'pending',
      curated_business_id: 'existing-curated',
    })

    await expect(activateEnrollmentTrial('tok-3')).rejects.toBeInstanceOf(EnrollmentTrialError)
  })

  it('defaults preview length to 30 days', () => {
    delete process.env.ENROLL_PREVIEW_TRIAL_DAYS
    expect(enrollPreviewTrialDays()).toBe(30)
  })
})
