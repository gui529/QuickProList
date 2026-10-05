import { NextRequest, NextResponse } from 'next/server'
import { getCuratedByDashboardToken } from '@/lib/kv'
import { getInvitationByCuratedBusinessId } from '@/lib/invitations'
import { createBillingPortalSession } from '@/lib/stripe'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { errorMessage } from '@/lib/errors'

/**
 * Self-serve entry point into the Stripe Billing Portal for a paying
 * business, keyed by its secret dashboard token (the same token that guards
 * `/dashboard/[token]`) — no separate login. Returns 404 for a token that
 * doesn't match any curated business, and 400 for one that has no paid
 * subscription on record (trial, canceled, or never-subscribed).
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!checkRateLimit(`stripe-portal:${ip}`, 10)) return rateLimitResponse()

  const body = await req.json().catch(() => null)
  const token = body?.token

  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }

  const business = await getCuratedByDashboardToken(token)
  if (!business) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const invitation = await getInvitationByCuratedBusinessId(business.id)
  if (!invitation?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No active subscription on record' }, { status: 400 })
  }

  try {
    const baseUrl = (
      process.env.SITE_URL ??
      req.headers.get('origin') ??
      'https://www.quickprolist.com'
    ).replace(/\/$/, '')
    const returnUrl = `${baseUrl}/dashboard/${token}`
    const portalUrl = await createBillingPortalSession(invitation.stripe_subscription_id, returnUrl)

    if (!portalUrl) {
      return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 })
    }

    return NextResponse.json({ url: portalUrl })
  } catch (err) {
    console.error('billing portal session failed:', err)
    const msg = errorMessage(err, 'Failed to create billing portal session')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
