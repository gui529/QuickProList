import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { getInvitationById, markInvitationCanceled } from '@/lib/invitations'
import { getStripe } from '@/lib/stripe'
import { errorMessage } from '@/lib/errors'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }

  const { id } = await params

  try {
    const inv = await getInvitationById(id)

    if (!inv) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }
    if (inv.status !== 'paid') {
      return NextResponse.json({ error: 'Subscription is not active' }, { status: 400 })
    }
    if (!inv.stripe_subscription_id) {
      return NextResponse.json({ error: 'No Stripe subscription on record' }, { status: 400 })
    }

    const stripe = getStripe()
    await stripe.subscriptions.update(inv.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    await markInvitationCanceled(id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('cancel subscription failed:', err)
    const msg = errorMessage(err, 'Failed to cancel subscription')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
