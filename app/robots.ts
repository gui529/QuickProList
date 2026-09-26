import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/login', '/enroll/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
