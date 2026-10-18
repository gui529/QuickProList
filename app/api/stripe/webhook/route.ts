import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, handleSubscriptionCanceled } from '@/lib/stripe'
import {
  getInvitationByToken,
  getInvitationBySubscriptionId,
  markInvitationPaid,
  markSubscriptionConfirmationSent,
} from '@/lib/invitations'
import { sendRenewalConfirmation, sendSubscriptionConfirmation, sendUpcomingRenewalNotice } from '@/lib/subscription-notice'
import { formatPreviewEndDate } from '@/lib/preview-date'
import { listingFieldsFromInvitation } from '@/lib/invitation-listing'
import {
  addCuratedFromYelp,
  addCuratedManual,
  findCuratedIdByYelpId,
  findLatestManualCuratedId,
  getCuratedById,
  clearCuratedTrial,
  publishCurated,
  setCuratedContactEmail,
  updateCuratedManual,
} from '@/lib/kv'
import { sendEmail } from '@/lib/email'
import type { EnrollmentInvitation } from '@/lib/invitations'
import type { Business } from '@/lib/business'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Subscription statuses that should delist the business. `past_due` is
// intentionally excluded — Stripe automatically retries a failed card
// several times before a subscription moves to `unpaid`/`canceled`, and
// that retry window is the grace period a business gets to fix a declined
// card before losing its listing. Only the terminal failure states delist.
const DELISTING_SUBSCRIPTION_STATUSES = new Set(['canceled', 'unpaid'])

function periodEndSeconds(subscription: {
  current_period_end?: number
  items?: { data?: Array<{ current_period_end?: number } | null> | null } | null
}): number | null {
  const fromItem = subscription.items?.data?.[0]?.current_period_end
  if (typeof fromItem === 'number') return fromItem
  return typeof subscription.current_period_end === 'number' ? subscription.current_period_end : null
}

async function nextChargeDateFor(subscriptionId: string): Promise<string | null> {
  if (!subscriptionId) return null
  const stripe = getStripe()
  const retrieve = stripe.subscriptions?.retrieve
  if (!retrieve) return null
  const subscription = await retrieve(subscriptionId)
  const seconds = periodEndSeconds(subscription)
  if (seconds === null) return null
  return formatPreviewEndDate(new Date(seconds * 1000).toISOString())
}

async function sendPaidConfirmation(
  invitation: EnrollmentInvitation,
  contactEmail: string,
  subscriptionId: string
): Promise<void> {
  if (invitation.subscription_confirmation_sent_at) return
  const nextChargeDate = (await nextChargeDateFor(subscriptionId)) ?? ''
  await sendSubscriptionConfirmation({
    businessName: invitation.business_name,
    accountEmail: contactEmail,
    nextChargeDate,
  })
  await markSubscriptionConfirmationSent(invitation.id)
}

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
        // re-inserting the curated business. A missed confirmation is retried.
        const contactEmail = session.customer_details?.email
        const existingSubscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription?.id ?? '')
        if (contactEmail) await sendPaidConfirmation(invitation, contactEmail, existingSubscriptionId)
        return NextResponse.json({ ok: true })
      }

      let curatedBusinessId: string

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

        curatedBusinessId = (await findCuratedIdByYelpId(invitation.yelp_id)) || ''
      } else if (invitation.curated_business_id) {
        // The invitation was created for a business that already had a
        // curated_businesses row (e.g. converting an existing manual pin to
        // a paid subscription) — update that row in place rather than
        // inserting a second, bare duplicate. See #35.
        await updateCuratedManual(invitation.curated_business_id, {
          name: invitation.business_name,
          category: invitation.category,
          cities: invitation.cities,
        })
        curatedBusinessId = invitation.curated_business_id
      } else {
        const details = listingFieldsFromInvitation(invitation)
        await addCuratedManual({
          name: invitation.business_name,
          category: invitation.category,
          cities: invitation.cities,
          ...(details.phone ? { phone: details.phone } : {}),
          ...(details.address ? { address: details.address } : {}),
          ...(details.websiteUrl ? { websiteUrl: details.websiteUrl } : {}),
          ...(details.imageUrl ? { imageUrl: details.imageUrl } : {}),
        })

        curatedBusinessId = (await findLatestManualCuratedId(invitation.business_name)) || ''
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
      if (curatedBusinessId) {
        await clearCuratedTrial(curatedBusinessId)
        await publishCurated(curatedBusinessId)
      }

      // Stripe Checkout always collects this; stash it so a future failed
      // payment (invoice.payment_failed) has an address to send a dunning
      // notice to.
      const contactEmail = session.customer_details?.email
      if (curatedBusinessId && contactEmail) {
        await setCuratedContactEmail(curatedBusinessId, contactEmail)
        const paid = await getInvitationByToken(token)
        if (paid) await sendPaidConfirmation(paid, contactEmail, subscriptionId)
      }
    } else if (event.type === 'invoice.upcoming') {
      const invoice = event.data.object as Stripe.Invoice
      await sendUpcomingRenewalNotice(invoice)
    } else if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice
      await sendRenewalConfirmation(invoice)
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
              "We weren't able to process your most recent QuickProList payment. Please update your payment method to keep your listing live.",
              { kind: 'transactional' }
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
