import Stripe from 'stripe'
import { getInvitationBySubscriptionId, markInvitationCanceled } from './invitations'
import { setCuratedDelisted } from './kv'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
    stripeClient = new Stripe(key)
  }
  return stripeClient
}

export async function createCheckoutSession(
  invitationToken: string,
  businessName: string,
  monthlyPrice: number,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(monthlyPrice * 100),
          recurring: { interval: 'month' },
          product_data: {
            name: `${businessName} - QuickProList Featured Listing`,
            metadata: { invitationToken },
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${returnUrl}?success=1`,
    cancel_url: returnUrl,
    metadata: { invitationToken },
  })
  return session.url || ''
}

/**
 * Handle a canceled/expired Stripe subscription: marks the linked
 * enrollment invitation canceled and delists its curated business (hides it
 * from `getCurated` without deleting the row) so search stops surfacing a
 * business that's no longer paying. Looks up the invitation by
 * `stripe_subscription_id`; a no-op if none matches (e.g. event for a
 * subscription this app never created).
 */
export async function handleSubscriptionCanceled(subscriptionId: string): Promise<void> {
  const invitation = await getInvitationBySubscriptionId(subscriptionId)
  if (!invitation) return

  if (invitation.status !== 'canceled') {
    await markInvitationCanceled(invitation.id)
  }
  if (invitation.curated_business_id) {
    await setCuratedDelisted(invitation.curated_business_id, true)
  }
}
