import { NextRequest, NextResponse } from 'next/server'
import { getInvitationByToken, isInvitationExpired } from '@/lib/invitations'
import { createCheckoutSession } from '@/lib/stripe'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!checkRateLimit(`checkout:${ip}`, 5)) return rateLimitResponse()
  const body = await req.json()
  const token = body.token

  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
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

    const baseUrl = (
      process.env.SITE_URL ??
      req.headers.get('origin') ??
      'https://www.quickprolist.com'
    ).replace(/\/$/, '')
    const returnUrl = `${baseUrl}/enroll/${token}`
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
    const msg = err instanceof Error ? err.message : 'Failed to create checkout'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
