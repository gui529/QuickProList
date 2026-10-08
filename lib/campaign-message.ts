import { formatCategoryLabel, formatCityLabel } from './display'

export interface CampaignMessageContext {
  businessName: string
  city?: string | null
  category?: string | null
}

/** Replace `{businessName}`, `{city}`, `{category}` in campaign SMS/email copy. */
export function expandCampaignMessage(template: string, ctx: CampaignMessageContext): string {
  const businessName = ctx.businessName.trim()
  const cityRaw = ctx.city?.trim()
  const categoryRaw = ctx.category?.trim()

  const city = cityRaw ? formatCityLabel(cityRaw) : 'your area'
  const category = categoryRaw ? formatCategoryLabel(categoryRaw) : 'home-service'

  const signature =
    process.env.CAMPAIGN_SENDER_NAME?.trim()
      ? `— ${process.env.CAMPAIGN_SENDER_NAME.trim()}, QuickProList`
      : '— The QuickProList team'

  return template
    .replaceAll('{businessName}', businessName)
    .replaceAll('{city}', city)
    .replaceAll('{category}', category)
    .replaceAll('{signature}', signature)
}
