import type { MetadataRoute } from 'next'
import { listAllCurated } from '@/lib/kv'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  // Without Supabase credentials configured, listAllCurated() resolves to [] —
  // the sitemap still builds successfully with just the static routes above.
  const curated = await listAllCurated().catch(() => [])
  const proRoutes: MetadataRoute.Sitemap = curated
    .filter((business) => business.proSiteEnabled)
    .map((business) => ({
      url: `${siteUrl}/pro/${business.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

  return [...staticRoutes, ...proRoutes]
}
