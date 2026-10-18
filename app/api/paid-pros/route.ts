import { NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { listPaidInvitations } from '@/lib/invitations'
import { getStripe } from '@/lib/stripe'

export interface PaidPro {
  id: string
  business_name: string
  category: string
  cities: string[]
  monthly_price: number
  status: 'paid' | 'canceled'
  stripe_subscription_id: string | null
  created_at: string
  canceled_at: string | null
  current_period_end: number | null
  cancel_at_period_end: boolean | null
}

export async function GET() {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }

  try {
    const invitations = await listPaidInvitations()
    const stripe = getStripe()

    const pros = await Promise.all(
      invitations.map(async (inv) => {
        let current_period_end: number | null = null
        let cancel_at_period_end: boolean | null = null

        if (inv.stripe_subscription_id) {
          try {
            const sub = await stripe.subscriptions.retrieve(inv.stripe_subscription_id)
            // In Stripe SDK v22+, current_period_end moved to SubscriptionItem
            current_period_end = sub.items.data[0]?.current_period_end ?? null
            cancel_at_period_end = sub.cancel_at_period_end
          } catch (err) {
            console.error(`Failed to fetch Stripe sub ${inv.stripe_subscription_id}:`, err)
          }
        }

        return {
          id: inv.id,
          business_name: inv.business_name,
          category: inv.category,
          cities: inv.cities,
          monthly_price: inv.monthly_price,
          status: inv.status as 'paid' | 'canceled',
          stripe_subscription_id: inv.stripe_subscription_id,
          created_at: inv.created_at,
          canceled_at: inv.canceled_at ?? null,
          current_period_end,
          cancel_at_period_end,
        } satisfies PaidPro
      })
    )

    return NextResponse.json({ pros })
  } catch (err) {
    console.error('listPaidPros failed:', err)
    return NextResponse.json({ error: 'Failed to load paid pros' }, { status: 500 })
  }
}
