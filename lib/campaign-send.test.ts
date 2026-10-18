import { beforeEach, describe, expect, it, vi } from 'vitest'

const { isSuppressedMock, sendEmailMock, createInvitationMock, recordContactMock } = vi.hoisted(() => ({
  isSuppressedMock: vi.fn(async () => false),
  sendEmailMock: vi.fn(async () => 'msg-1'),
  createInvitationMock: vi.fn(async () => 'invitation-token'),
  recordContactMock: vi.fn(async () => ({ id: 'contact-1' })),
}))

vi.mock('./suppressions', async (orig) => ({
  ...(await orig<typeof import('./suppressions')>()),
  isSuppressed: isSuppressedMock,
}))
vi.mock('./email', () => ({ sendEmail: sendEmailMock }))
vi.mock('./invitations', () => ({ createInvitation: createInvitationMock }))
vi.mock('./campaigns', () => ({
  DEFAULT_MESSAGE: 'Hello {businessName}',
  expandCampaignMessage: (template: string) => template,
  recordContact: recordContactMock,
}))

import { sendCampaignEmail } from './campaign-send'
import { SuppressedError } from './suppressions'

describe('sendCampaignEmail suppression', () => {
  beforeEach(() => {
    isSuppressedMock.mockReset()
    isSuppressedMock.mockResolvedValue(false)
    sendEmailMock.mockClear()
    createInvitationMock.mockClear()
    recordContactMock.mockClear()
  })

  it('skips a recipient who opted out of a preview', async () => {
    isSuppressedMock.mockResolvedValue(true)
    await expect(
      sendCampaignEmail({
        businessName: 'Geek Company',
        email: 'geek@example.com',
        category: 'Computer repair',
        city: 'acworth',
      })
    ).rejects.toBeInstanceOf(SuppressedError)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(createInvitationMock).not.toHaveBeenCalled()
    expect(recordContactMock).not.toHaveBeenCalled()
  })

  it('stores the prospect phone and other details on the invitation', async () => {
    await sendCampaignEmail({
      businessName: 'Acme Plumbing',
      email: 'owner@acme.example',
      category: 'plumbing',
      city: 'Marietta',
      phone: '770-555-0142',
      address: '10 Main St',
      website: 'https://acme.example',
      logoUrl: 'https://acme.example/logo.png',
    })

    expect(createInvitationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        businessName: 'Acme Plumbing',
        category: 'plumbing',
        cities: ['Marietta'],
        yelpData: expect.objectContaining({
          phone: '770-555-0142',
          address: '10 Main St',
          websiteUrl: 'https://acme.example',
          imageUrl: 'https://acme.example/logo.png',
        }),
      })
    )
  })

  it('stores an empty phone instead of inventing one', async () => {
    await sendCampaignEmail({
      businessName: 'No Phone Co',
      email: 'owner@nophone.example',
      category: 'roofing',
      city: 'Kennesaw',
      phone: '   ',
    })

    const input = createInvitationMock.mock.calls[0][0] as { yelpData: { phone: string } }
    expect(input.yelpData.phone).toBe('')
  })
})
