import { normalizeCategory } from './categories'
import { formatCategoryLabel, formatCategorySearchPhrase, formatCityLabel } from './display'
import { formatCampaignAreasPhrase } from './open-towns'

export interface CampaignMessageContext {
  businessName: string
  city?: string | null
  category?: string | null
}

export function campaignSiteUrl(): string {
  return (process.env.SITE_URL ?? 'https://www.quickprolist.com').replace(/\/$/, '')
}

/** Replace `{senderIntro}`, `{businessName}`, `{city}`, `{category}`, `{areas}`, `{siteUrl}`, `{signature}` in campaign copy. */
export function expandCampaignMessage(template: string, ctx: CampaignMessageContext): string {
  const businessName = ctx.businessName.trim()
  const cityRaw = ctx.city?.trim()
  const categoryRaw = ctx.category?.trim()

  const city = cityRaw ? formatCityLabel(cityRaw) : 'your area'
  const category = categoryRaw ? formatCategoryLabel(categoryRaw) : 'home-service'
  const categoryPhrase = formatCategorySearchPhrase(categoryRaw)
  const areas = formatCampaignAreasPhrase(cityRaw)

  const senderName = process.env.CAMPAIGN_SENDER_NAME?.trim()
  const senderIntro = senderName ? `I'm ${senderName} with QuickProList` : "I'm with QuickProList"

  const signature =
    senderName ? `— ${senderName}, QuickProList` : '— The QuickProList team'

  const siteUrl = campaignSiteUrl()
  const searchUrl =
    cityRaw && categoryRaw
      ? `${siteUrl}/search?location=${encodeURIComponent(cityRaw)}&category=${encodeURIComponent(normalizeCategory(categoryRaw))}`
      : siteUrl

  return template
    .replaceAll('{senderIntro}', senderIntro)
    .replaceAll('{businessName}', businessName)
    .replaceAll('{city}', city)
    .replaceAll('{category} pros', categoryPhrase)
    .replaceAll('{category}', category)
    .replaceAll('{areas}', areas)
    .replaceAll('{siteUrl}', siteUrl)
    .replaceAll('{searchUrl}', searchUrl)
    .replaceAll('{signature}', signature)
}
