import { NextRequest, NextResponse } from 'next/server'
import { gateAdminOrOutreach } from '@/lib/outreach-auth'
import { recordContact, DEFAULT_MESSAGE, expandCampaignMessage } from '@/lib/campaigns'
import { sendCampaignEmail } from '@/lib/campaign-send'
import { sendSms, normalizePhone, SmsDisabledError } from '@/lib/sms'
import { SuppressedError, isSuppressed, normalizeEmail } from '@/lib/suppressions'
import { errorMessage as toErrorMessage } from '@/lib/errors'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const denied = await gateAdminOrOutreach(req)
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status })
  }

  let body: {
    channel?: string
    businessName?: string
    phone?: string
    email?: string
    yelpId?: string
    category?: string
    city?: string
    message?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { businessName, phone, email, yelpId, category, city, message } = body
  const channel = body.channel === 'email' ? 'email' : 'sms'

  if (!businessName?.trim()) {
    return NextResponse.json({ error: 'businessName is required' }, { status: 400 })
  }

  if (channel === 'sms' && !phone?.trim()) {
    return NextResponse.json({ error: 'phone is required for SMS' }, { status: 400 })
  }
  if (channel === 'email' && !email?.trim()) {
    return NextResponse.json({ error: 'email is required for email campaign' }, { status: 400 })
  }
  if (channel === 'email' && (!category?.trim() || !city?.trim())) {
    return NextResponse.json(
      {
        error:
          'city and category are required for email campaigns so we can generate a listing preview link',
      },
      { status: 400 }
    )
  }

  const rawMessage = message?.trim() || DEFAULT_MESSAGE
  const messageBody = expandCampaignMessage(rawMessage, {
    businessName: businessName!.trim(),
    city: city?.trim(),
    category: category?.trim(),
  })

  if (channel === 'email' && (await isSuppressed('email', normalizeEmail(email!)))) {
    return NextResponse.json(
      { error: 'Recipient has opted out and cannot be contacted' },
      { status: 409 }
    )
  }

  let messageSid: string | undefined
  let status: 'sent' | 'failed' = 'sent'
  let errorMessage: string | undefined
  let normalizedPhone: string | undefined
  try {
    // Refused sends are not attempts: don't log them as sent/failed contacts.
    const refusal = (err: unknown) => {
      if (err instanceof SuppressedError) {
        return NextResponse.json(
          { error: 'Recipient has opted out and cannot be contacted' },
          { status: 409 }
        )
      }
      if (err instanceof SmsDisabledError) {
        return NextResponse.json({ error: err.message }, { status: 403 })
      }
      return null
    }

    if (channel === 'sms') {
      const normalized = normalizePhone(phone!.trim())
      if (!normalized) {
        return NextResponse.json(
          { error: 'Invalid phone number — must be a 10 or 11 digit US number' },
          { status: 400 }
        )
      }
      normalizedPhone = normalized
      try {
        messageSid = await sendSms(normalized, messageBody)
      } catch (err) {
        const refused = refusal(err)
        if (refused) return refused
        status = 'failed'
        errorMessage = toErrorMessage(err, String(err))
      }
    } else {
      try {
        const result = await sendCampaignEmail({
          businessName: businessName.trim(),
          email: email!.trim(),
          category: category!.trim(),
          city: city!.trim(),
          yelpId: yelpId?.trim(),
          message: rawMessage,
        })
        if (result.status === 'failed') {
          return NextResponse.json(
            { error: result.errorMessage, contact: result.contact },
            { status: 502 }
          )
        }
        return NextResponse.json({ contact: result.contact })
      } catch (err) {
        const refused = refusal(err)
        if (refused) return refused
        throw err
      }
    }

    const contact = await recordContact({
      yelpId: yelpId?.trim() || undefined,
      businessName: businessName.trim(),
      phone: normalizedPhone,
      channel,
      category: category?.trim() || undefined,
      city: city?.trim() || undefined,
      messageBody,
      messageSid,
      status,
      errorMessage,
    })

    if (status === 'failed') {
      return NextResponse.json({ error: errorMessage, contact }, { status: 502 })
    }

    return NextResponse.json({ contact })
  } catch (err) {
    console.error('campaign send failed:', err)
    return NextResponse.json({ error: 'Failed to send campaign message' }, { status: 500 })
  }
}
