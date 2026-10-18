import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import ProSiteView from '@/components/ProSiteView'
import { CAMPAIGN_TRIAL_DAYS, getCampaignPostalAddress, previewEnrollCta } from '@/lib/campaign-defaults'
import { formatSubscriptionPrice } from '@/lib/subscription-terms'
import { isPreviewPagesEnabled } from '@/lib/feature-flags'
import { isUuid } from '@/lib/is-uuid'
import { LISTING_NOT_LIVE_YET } from '@/lib/listing-preview-copy'
import { EXISTING_LISTING_NOTE, loadPreviewListing } from '@/lib/preview-listing'
import {
  buildPreviewOptOutHref,
  getActivePreview,
  isPreviewTokenFormat,
  recordPreviewView,
  sanitizePreviewRef,
  shouldCountPreviewView,
  type PreviewTokenRecord,
} from '@/lib/preview-tokens'

export const dynamic = 'force-dynamic'

export const PREVIEW_BANNER_TEXT = 'This is a preview of your QuickProList listing.'

const ROBOTS: Metadata['robots'] = { index: false, follow: false }

function enrollHref(record: PreviewTokenRecord): string | null {
  const token = record.invitationToken?.trim() ?? ''
  if (!isUuid(token)) return null
  return `/enroll/${token}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  if (!isPreviewPagesEnabled()) return { title: 'QuickProList', robots: ROBOTS }
  const { token } = await params
  if (!isPreviewTokenFormat(token)) return { title: 'QuickProList', robots: ROBOTS }
  try {
    const record = await getActivePreview(token)
    if (!record) return { title: 'QuickProList', robots: ROBOTS }
    const listing = await loadPreviewListing(record)
    const name = listing?.business.name
    return {
      title: name ? `${name} | QuickProList` : 'QuickProList',
      robots: ROBOTS,
    }
  } catch {
    return { title: 'QuickProList', robots: ROBOTS }
  }
}

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ ref?: string | string[] }>
}) {
  if (!isPreviewPagesEnabled()) notFound()

  const { token } = await params
  if (!isPreviewTokenFormat(token)) notFound()

  let record: PreviewTokenRecord | null
  try {
    record = await getActivePreview(token)
  } catch {
    notFound()
  }
  if (!record) notFound()

  let listing
  try {
    listing = await loadPreviewListing(record)
  } catch {
    notFound()
  }
  if (!listing) notFound()

  const sp = await searchParams
  const rawRef = Array.isArray(sp.ref) ? sp.ref[0] : sp.ref
  const ref = sanitizePreviewRef(rawRef)
  const requestHeaders = await headers()
  if (
    shouldCountPreviewView({
      userAgent: requestHeaders.get('user-agent'),
      purpose: requestHeaders.get('purpose') ?? requestHeaders.get('sec-purpose'),
      method: 'GET',
    })
  ) {
    void recordPreviewView(token, {
      ref,
      userAgent: requestHeaders.get('user-agent'),
    }).catch(() => {})
  }

  const cta = previewEnrollCta()
  const postal = getCampaignPostalAddress()
  const optOutHref = buildPreviewOptOutHref(record.recipientEmail, token)
  const enroll = enrollHref(record)

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="sticky top-0 z-50 bg-amber-400 text-slate-950 text-center text-sm font-semibold px-4 py-2">
        {PREVIEW_BANNER_TEXT}
      </div>

      {listing.existingListingNote && (
        <p className="bg-amber-50 text-amber-950 text-sm text-center px-4 py-2 border-b border-amber-200">
          {EXISTING_LISTING_NOTE}
        </p>
      )}

      <section className="bg-slate-50 border-b border-slate-200 px-6 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{cta.headline}</h2>
          <p className="mt-2 text-sm text-slate-600">{cta.detail}</p>
          <p className="mt-3 text-sm text-slate-600">{LISTING_NOT_LIVE_YET}</p>
          {enroll && (
            <Link
              href={enroll}
              className="inline-flex mt-5 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
            >
              Go live free for {CAMPAIGN_TRIAL_DAYS} days
            </Link>
          )}
          <p className="mt-3 text-sm text-slate-600">
            No card needed. Comes down on its own after {CAMPAIGN_TRIAL_DAYS} days unless you choose{' '}
            {formatSubscriptionPrice()}/mo.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            During your free {CAMPAIGN_TRIAL_DAYS} days, your listing is labeled Sponsored in search.
          </p>
        </div>
      </section>

      <ProSiteView business={listing.business} trackContacts={false} />

      <footer className="bg-slate-950 text-white/70 px-6 py-10 text-center text-sm">
        <p>This is a promotional preview from QuickProList.</p>
        {postal && <p className="mt-2 text-white/80">{postal}</p>}
        <p className="mt-3">
          Not interested?{' '}
          {optOutHref ? (
            <a href={optOutHref} className="underline text-white">
              Click here
            </a>
          ) : (
            'Click here'
          )}{' '}
          (or reply &apos;no&apos;) and we won&apos;t contact you again.
        </p>
        <p className="mt-3">
          <Link href="/privacy" className="underline hover:text-white">
            Privacy
          </Link>
          <span className="mx-2 text-white/30">·</span>
          <Link href="/terms" className="underline hover:text-white">
            Terms
          </Link>
        </p>
      </footer>
    </div>
  )
}
