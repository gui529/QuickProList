import { NextRequest, NextResponse } from 'next/server'
import { AuthError, requireAdmin } from '@/lib/auth'
import { recordContact, DEFAULT_MESSAGE } from '@/lib/campaigns'
import { sendSms, normalizePhone, SmsDisabledError } from '@/lib/sms'
import { SuppressedError, isSuppressed, normalizeEmail } from '@/lib/suppressions'
import { sendEmail } from '@/lib/email'
import { createInvitation } from '@/lib/invitations'

export const maxDuration = 60

async function gate(): Promise<NextResponse | null> {
  try {
    await requireAdmin()
    return null
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}

export async function POST(req: NextRequest) {
  const denied = await gate()
  if (denied) return denied

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

  const messageBody = message?.trim() || DEFAULT_MESSAGE

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
  let invitationToken: string | undefined
  let enrollUrl: string | undefined

  // Auto-create enrollment invitation for email campaigns with city + category
  if (channel === 'email' && category?.trim() && city?.trim()) {
    try {
      const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')
      invitationToken = await createInvitation({
        businessName: businessName!.trim(),
        category: category.trim(),
        cities: [city.trim()],
        monthlyPrice: 29.99,
        yelpId: yelpId?.trim() || undefined,
      })
      enrollUrl = `${siteUrl}/enroll/${invitationToken}`
    } catch (err) {
      console.error('Failed to create invitation for campaign:', err)
    }
  }

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
        errorMessage = err instanceof Error ? err.message : String(err)
      }
    } else {
      try {
        messageSid = await sendEmail(email!.trim(), businessName.trim(), messageBody, {
          yelpId: yelpId?.trim(),
          category: category?.trim(),
          city: city?.trim(),
          enrollUrl,
        })
      } catch (err) {
        const refused = refusal(err)
        if (refused) return refused
        status = 'failed'
        errorMessage = err instanceof Error ? err.message : String(err)
      }
    }

    const contact = await recordContact({
      yelpId: yelpId?.trim() || undefined,
      businessName: businessName.trim(),
      phone: normalizedPhone,
      email: channel === 'email' ? email!.trim() : undefined,
      channel,
      category: category?.trim() || undefined,
      city: city?.trim() || undefined,
      messageBody,
      messageSid,
      status,
      errorMessage,
      invitationToken,
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
