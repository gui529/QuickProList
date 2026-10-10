import { DEFAULT_MESSAGE, expandCampaignMessage, recordContact } from './campaigns'
import { sendEmail } from './email'
import { createInvitation } from './invitations'
import { SuppressedError, isSuppressed, normalizeEmail } from './suppressions'
import { errorMessage as toErrorMessage } from './errors'

export interface SendCampaignEmailInput {
  businessName: string
  email: string
  category: string
  city: string
  yelpId?: string
  message?: string
}

export interface SendCampaignEmailResult {
  status: 'sent' | 'failed'
  messageSid?: string
  invitationToken?: string
  messageBody: string
  errorMessage?: string
  contact: Awaited<ReturnType<typeof recordContact>>
}

export async function sendCampaignEmail(
  input: SendCampaignEmailInput
): Promise<SendCampaignEmailResult> {
  const businessName = input.businessName.trim()
  const email = input.email.trim()
  const category = input.category.trim()
  const city = input.city.trim()

  if (!businessName || !email || !category || !city) {
    throw new Error('businessName, email, category, and city are required')
  }

  if (await isSuppressed('email', normalizeEmail(email))) {
    throw new SuppressedError('email', normalizeEmail(email))
  }

  const rawMessage = input.message?.trim() || DEFAULT_MESSAGE
  const messageBody = expandCampaignMessage(rawMessage, {
    businessName,
    city,
    category,
  })

  let invitationToken: string | undefined
  let enrollUrl: string | undefined
  try {
    const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')
    invitationToken = await createInvitation({
      businessName,
      category,
      cities: [city],
      monthlyPrice: 29.99,
      yelpId: input.yelpId?.trim() || undefined,
      contactEmail: email,
    })
    enrollUrl = `${siteUrl}/enroll/${invitationToken}`
  } catch (err) {
    console.error('Failed to create invitation for campaign:', err)
  }

  let messageSid: string | undefined
  let status: 'sent' | 'failed' = 'sent'
  let errorMessage: string | undefined

  try {
    messageSid = await sendEmail(email, businessName, messageBody, {
      yelpId: input.yelpId?.trim(),
      category,
      city,
      enrollUrl,
    })
  } catch (err) {
    if (err instanceof SuppressedError) throw err
    status = 'failed'
    errorMessage = toErrorMessage(err, String(err))
  }

  const contact = await recordContact({
    yelpId: input.yelpId?.trim() || undefined,
    businessName,
    email,
    channel: 'email',
    category,
    city,
    messageBody,
    messageSid,
    status,
    errorMessage,
    invitationToken,
  })

  return { status, messageSid, invitationToken, messageBody, errorMessage, contact }
}
