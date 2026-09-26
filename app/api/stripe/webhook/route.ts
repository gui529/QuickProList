import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { getStripe, handleSubscriptionCanceled } from '@/lib/stripe'
import { getInvitationByToken, getInvitationBySubscriptionId, markInvitationPaid } from '@/lib/invitations'
import { addCuratedFromYelp, addCuratedManual, getCuratedById, setCuratedContactEmail } from '@/lib/kv'
import { sendEmail } from '@/lib/email'
import type { Business } from '@/lib/yelp'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Subscription statuses that should delist the business. `past_due` is
// intentionally excluded — Stripe automatically retries a failed card
// several times before a subscription moves to `unpaid`/`canceled`, and
// that retry window is the grace period a business gets to fix a declined
// card before losing its listing. Only the terminal failure states delist.
const DELISTING_SUBSCRIPTION_STATUSES = new Set(['canceled', 'unpaid'])

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const stripe = getStripe()
  let event

  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const token = session.metadata?.invitationToken

      if (!token) {
        console.warn('checkout.session.completed missing invitationToken')
        return NextResponse.json({ ok: true })
      }

      const invitation = await getInvitationByToken(token)
      if (!invitation) {
        console.warn('Invitation not found for token:', token)
        return NextResponse.json({ ok: true })
      }

      if (invitation.status === 'paid') {
        // Already processed — Stripe retries the same event on any non-2xx
        // response or timeout, so this must be a safe no-op rather than
        // re-inserting the curated business.
        return NextResponse.json({ ok: true })
      }

      let curatedBusinessId: string
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      if (invitation.yelp_id && invitation.yelp_data) {
        const business = invitation.yelp_data as Partial<Business>
        await addCuratedFromYelp(
          {
            id: invitation.yelp_id,
            name: invitation.business_name,
            rating: business.rating ?? null,
            reviewCount: business.reviewCount ?? null,
            phone: business.phone || '',
            address: business.address || '',
            imageUrl: business.imageUrl || '',
            url: business.url || '',
            categories: business.categories || [],
            cities: invitation.cities,
            category: invitation.category,
            source: 'yelp',
            yelpId: invitation.yelp_id,
          },
          invitation.category,
          invitation.cities
        )

        const { data } = await supabase
          .from('curated_businesses')
          .select('id')
          .eq('yelp_id', invitation.yelp_id)
          .single()

        curatedBusinessId = data?.id || ''
      } else {
        await addCuratedManual({
          name: invitation.business_name,
          category: invitation.category,
          cities: invitation.cities,
        })

        const { data } = await supabase
          .from('curated_businesses')
          .select('id')
          .eq('name', invitation.business_name)
          .eq('source', 'manual')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        curatedBusinessId = data?.id || ''
      }

      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription?.id ?? '')

      await markInvitationPaid(
        token,
        session.id,
        subscriptionId,
        curatedBusinessId
      )

      // Stripe Checkout always collects this; stash it so a future failed
      // payment (invoice.payment_failed) has an address to send a dunning
      // notice to.
      const contactEmail = session.customer_details?.email
      if (curatedBusinessId && contactEmail) {
        await setCuratedContactEmail(curatedBusinessId, contactEmail)
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscriptionCanceled(subscription.id)
    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      if (DELISTING_SUBSCRIPTION_STATUSES.has(subscription.status)) {
        await handleSubscriptionCanceled(subscription.id)
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionRef = invoice.parent?.subscription_details?.subscription
      const subscriptionId =
        typeof subscriptionRef === 'string' ? subscriptionRef : (subscriptionRef?.id ?? '')

      if (subscriptionId) {
        const invitation = await getInvitationBySubscriptionId(subscriptionId)
        const curatedBusinessId = invitation?.curated_business_id
        if (curatedBusinessId) {
          const business = await getCuratedById(curatedBusinessId)
          if (business?.contactEmail) {
            await sendEmail(
              business.contactEmail,
              business.name,
              "We weren't able to process your most recent QuickProList payment. Please update your payment method to keep your listing live."
            )
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
