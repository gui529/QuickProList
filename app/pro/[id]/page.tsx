import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ProSiteView from '@/components/ProSiteView'
import { listingProgramBusinessIds } from '@/lib/invitations'
import { getCuratedById, incrementProfileView } from '@/lib/kv'
import { isUuid } from '@/lib/is-uuid'
import type { Business } from '@/lib/business'
import { toPublicBusiness } from '@/lib/public-business'
import { withSponsoredFlag } from '@/lib/sponsored'

export const dynamic = 'force-dynamic'

async function loadBusiness(id: string): Promise<Business | null> {
  if (!isUuid(id)) return null
  const business = await getCuratedById(id)
  if (!business) return null
  const programIds = business.isTrial
    ? new Set<string>()
    : await listingProgramBusinessIds([business.id])
  const [annotated] = withSponsoredFlag([business], programIds)
  return toPublicBusiness(annotated)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const business = await loadBusiness(id)
  if (!business || !business.proSiteEnabled) {
    return { title: 'QuickProList' }
  }

  const title = `${business.name} | QuickProList`
  const description = business.address
    ? `${business.name} — local pro serving ${business.address}. View contact info on QuickProList.`
    : `${business.name} — local pro on QuickProList. View contact info.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: business.imageUrl ? [business.imageUrl] : undefined,
    },
  }
}

export default async function ProSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const business = await loadBusiness(id)
  if (!business || !business.proSiteEnabled) notFound()

  // Fire-and-forget: never block rendering the page over a counter update.
  // Preview pages do not call this.
  void incrementProfileView(business.id)
  return <ProSiteView business={business} trackContacts />
}
