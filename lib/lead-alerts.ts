import { sendEmail } from './email'
import type { ContactClickType } from './kv'

/**
 * A curated business that can receive a real-time lead alert.
 * `contactEmail` is `curated_businesses.contact_email` (see `Business`).
 */
export interface LeadAlertBusiness {
  name: string
  contactEmail?: string | null
}

/**
 * Email a business the moment a homeowner clicks call, website, or
 * directions on its ProSite. No-ops when there is no `contact_email` on
 * file. Transactional: this is an account notice to a subscriber, not a
 * marketing pitch, so marketing opt-outs do not suppress it.
 */
export async function sendLeadAlertEmail(
  business: LeadAlertBusiness,
  clickType: ContactClickType
): Promise<void> {
  const to = business.contactEmail?.trim()
  if (!to) return

  const body = [
    `A homeowner just clicked the ${clickType} link on ${business.name}'s QuickProList listing.`,
    'Responding quickly is the best way to win the job.',
  ].join('\n')

  await sendEmail(to, business.name, body, { kind: 'transactional' })
}
