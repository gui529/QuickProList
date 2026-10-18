import { NextRequest, NextResponse } from 'next/server'
import { getInvitationByToken, isInvitationExpired, recordSubscriptionConsent } from '@/lib/invitations'
import { isUuid } from '@/lib/is-uuid'
import { createCheckoutSession } from '@/lib/stripe'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import {
  SUBSCRIPTION_CONSENT_REQUIRED_ERROR,
  SUBSCRIPTION_PRICE_MISMATCH_ERROR,
  isConfiguredSubscriptionPrice,
  subscriptionDisclosureText,
} from '@/lib/subscription-terms'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!checkRateLimit(`checkout:${ip}`, 5)) return rateLimitResponse()
  const body = await req.json()
  const token = body.token

  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }

  if (body.consent !== true) {
    return NextResponse.json({ error: SUBSCRIPTION_CONSENT_REQUIRED_ERROR }, { status: 400 })
  }

  if (typeof token !== 'string' || !isUuid(token)) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  try {
    const invitation = await getInvitationByToken(token)
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (isInvitationExpired(invitation)) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
    }

    if (invitation.status === 'paid') {
      return NextResponse.json({ error: 'Invitation already paid' }, { status: 400 })
    }
    if (invitation.status !== 'pending' && invitation.status !== 'trial') {
      return NextResponse.json({ error: 'Invitation is not eligible for checkout' }, { status: 400 })
    }
    if (!isConfiguredSubscriptionPrice(invitation.monthly_price)) {
      return NextResponse.json({ error: SUBSCRIPTION_PRICE_MISMATCH_ERROR }, { status: 400 })
    }

    const baseUrl = (
      process.env.SITE_URL ??
      req.headers.get('origin') ??
      'https://www.quickprolist.com'
    ).replace(/\/$/, '')
    const returnUrl = `${baseUrl}/enroll/${token}`
    await recordSubscriptionConsent(token, subscriptionDisclosureText(), new Date().toISOString())
    const checkoutUrl = await createCheckoutSession(
      token,
      invitation.business_name,
      invitation.monthly_price,
      returnUrl
    )

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ checkoutUrl })
  } catch (err) {
    console.error('checkout failed:', err)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}
