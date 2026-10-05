import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getCuratedById, incrementProfileView } from '@/lib/kv'
import type { Business } from '@/lib/business'
import { toPublicBusiness } from '@/lib/public-business'
import TrackedContactLink from '@/components/TrackedContactLink'

export const dynamic = 'force-dynamic'

async function loadBusiness(id: string): Promise<Business | null> {
  const business = await getCuratedById(id)
  return business ? toPublicBusiness(business) : null
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

function deriveCity(address?: string): string | null {
  if (!address) return null
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean)
  return parts.length >= 2 ? parts[parts.length - 2] : null
}

export default async function ProSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const business = await loadBusiness(id)
  if (!business || !business.proSiteEnabled) notFound()

  const biz = business as Business
  // Fire-and-forget: never block rendering the page over a counter update.
  void incrementProfileView(biz.id)
  const mapsUrl = biz.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(biz.address)}`
    : null
  const serviceAreaCities =
    biz.cities && biz.cities.length > 0
      ? biz.cities
      : ([deriveCity(biz.address)].filter(Boolean) as string[])
  const allPhotos = [
    ...(biz.imageUrl ? [biz.imageUrl] : []),
    ...(biz.photos ?? []),
  ].slice(0, 4)
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero */}
      <section className="relative min-h-[72vh] flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        {biz.imageUrl && (
          <div className="absolute inset-0">
            <Image
              src={biz.imageUrl}
              alt=""
              fill
              className="object-cover opacity-20"
              sizes="100vw"
              priority
            />
          </div>
        )}

        <nav className="relative z-10 flex items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            QuickProList
          </Link>
          <span className="text-white/40 text-xs tracking-widest uppercase">ProSite</span>
        </nav>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pb-16 pt-8">
          {biz.imageUrl ? (
            <div className="relative h-28 w-28 rounded-full ring-4 ring-white/20 shadow-2xl overflow-hidden mb-6">
              <Image
                src={biz.imageUrl}
                alt={biz.name}
                fill
                className="object-cover"
                sizes="112px"
              />
            </div>
          ) : (
            <div className="h-28 w-28 rounded-full ring-4 ring-white/20 shadow-2xl bg-white/10 flex items-center justify-center mb-6">
              <svg
                viewBox="0 0 24 24"
                className="h-12 w-12 text-white/40"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </div>
          )}

          {biz.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mb-4">
              {biz.categories.slice(0, 3).map((cat) => (
                <span
                  key={cat}
                  className="text-xs font-semibold tracking-wide text-white/60 bg-white/10 px-3 py-1 rounded-full"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-5 max-w-2xl">
            {biz.name}
          </h1>

          <div className="flex flex-wrap gap-3 justify-center">
            {biz.phone && (
              <TrackedContactLink
                businessId={biz.id}
                clickType="phone"
                href={`tel:${biz.phone}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all shadow-lg bg-white text-slate-900 hover:bg-slate-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
                </svg>
                {biz.phone}
              </TrackedContactLink>
            )}
            {mapsUrl && (
              <TrackedContactLink
                businessId={biz.id}
                clickType="directions"
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/20 transition-all"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Get Directions
              </TrackedContactLink>
            )}
            {biz.websiteUrl && (
              <TrackedContactLink
                businessId={biz.id}
                clickType="website"
                href={biz.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/20 transition-all"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                Visit Website
              </TrackedContactLink>
            )}
          </div>

        </div>

        <div className="relative z-10">
          <svg
            viewBox="0 0 1440 60"
            className="w-full fill-white"
            preserveAspectRatio="none"
            style={{ display: 'block', height: 48 }}
          >
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </section>

      {/* Services */}
      {biz.categories.length > 0 && (
        <section className="bg-white px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">Services</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-10">What we offer</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {biz.categories.map((cat) => (
                <div key={cat} className="flex items-center gap-4 bg-slate-50 rounded-2xl p-5 ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-white hover:shadow-sm transition-all">
                  <div className="h-10 w-10 rounded-xl bg-white ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="font-semibold text-slate-800 leading-snug">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Photos */}
      {allPhotos.length > 1 && (
        <section className="bg-slate-950 px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-white/30 mb-3">Photos</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-8">Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-2 relative aspect-video rounded-2xl overflow-hidden">
                <Image src={allPhotos[0]} alt={`${biz.name} photo 1`} fill className="object-cover hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, 66vw" />
              </div>
              {allPhotos.slice(1).map((url, i) => (
                <div key={i} className="relative aspect-video sm:aspect-square rounded-2xl overflow-hidden">
                  <Image src={url} alt={`${biz.name} photo ${i + 2}`} fill className="object-cover hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 50vw, 33vw" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Service Area */}
      {serviceAreaCities.length > 0 && (
        <section className="bg-slate-50 px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">Service Area</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-10">Areas we serve</h2>
            <div className="flex flex-wrap gap-3">
              {serviceAreaCities.map((c) => (
                <div key={c} className="flex items-center gap-2.5 bg-white ring-1 ring-slate-200 rounded-2xl px-5 py-3 hover:ring-slate-300 hover:shadow-sm transition-all">
                  <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 capitalize">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="bg-white px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">Contact</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-10">Get in touch</h2>
          <div className="bg-slate-50 rounded-3xl ring-1 ring-slate-200 overflow-hidden divide-y divide-slate-200">
            {biz.phone && (
              <TrackedContactLink businessId={biz.id} clickType="phone" href={`tel:${biz.phone}`} className="flex items-center gap-5 px-6 py-5 hover:bg-white transition-colors group">
                <div className="h-11 w-11 rounded-2xl bg-white ring-1 ring-slate-200 group-hover:ring-slate-300 flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400 font-medium mb-0.5">Phone</p>
                  <p className="text-slate-900 font-bold text-lg leading-none">{biz.phone}</p>
                </div>
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </TrackedContactLink>
            )}
            {biz.address && (
              <TrackedContactLink businessId={biz.id} clickType="directions" href={mapsUrl ?? '#'} target={mapsUrl ? '_blank' : undefined} rel="noopener noreferrer" className="flex items-center gap-5 px-6 py-5 hover:bg-white transition-colors group">
                <div className="h-11 w-11 rounded-2xl bg-white ring-1 ring-slate-200 group-hover:ring-slate-300 flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400 font-medium mb-0.5">Address</p>
                  <p className="text-slate-900 font-semibold leading-snug">{biz.address}</p>
                </div>
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </TrackedContactLink>
            )}
            {biz.websiteUrl && (
              <TrackedContactLink businessId={biz.id} clickType="website" href={biz.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-5 px-6 py-5 hover:bg-white transition-colors group">
                <div className="h-11 w-11 rounded-2xl bg-white ring-1 ring-slate-200 group-hover:ring-slate-300 flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400 font-medium mb-0.5">Website</p>
                  <p className="text-slate-900 font-semibold truncate">{biz.websiteUrl.replace(/^https?:\/\//, '')}</p>
                </div>
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17 17 7" /><path d="M8 7h9v9" />
                </svg>
              </TrackedContactLink>
            )}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-3">
            Ready to get started?
          </h2>
          <p className="text-white/50 text-lg mb-10">Get in touch with {biz.name} today.</p>
          {biz.phone && (
            <TrackedContactLink businessId={biz.id} clickType="phone" href={`tel:${biz.phone}`} className="group inline-flex flex-col items-center gap-1 bg-white hover:bg-slate-100 transition-colors rounded-3xl px-10 py-5 shadow-2xl mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Call us</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{biz.phone}</span>
            </TrackedContactLink>
          )}
          {biz.websiteUrl && (
            <div>
              <TrackedContactLink businessId={biz.id} clickType="website" href={biz.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-white/50 hover:text-white/80 transition-colors">
                or visit our website
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17 17 7" /><path d="M8 7h9v9" />
                </svg>
              </TrackedContactLink>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-white/5 px-6 py-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm mb-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Powered by QuickProList
        </Link>
        <p className="text-white/20 text-xs">Find home service pros in your area</p>
      </footer>
    </div>
  )
}
