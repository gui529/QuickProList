/**
 * Profile completeness for a curated business.
 *
 * Website, contact email, review link, and ProSite are always scored — those
 * fields exist on every listing today. Photo (`imageUrl`), About, services,
 * and hours are scored only when that property is actually present, so the
 * checklist stays limited to data the app stores until self-serve profile
 * content and photo upload exist.
 */
export interface ProfileCompletenessInput {
  websiteUrl?: string | null
  contactEmail?: string | null
  reviewUrl?: string | null
  proSiteEnabled?: boolean | null
  imageUrl?: string | null
  about?: string | null
  services?: readonly string[] | null
  hours?: readonly unknown[] | null
}

export interface CompletenessItem {
  id: string
  label: string
  done: boolean
  /**
   * DOM id of the dashboard control that completes this item.
   * Omitted when the business cannot complete the step themselves (ProSite
   * is turned on from the admin list).
   */
  targetId?: string
}

export interface Completeness {
  /** Integer 0–100. Each included item has equal weight. */
  score: number
  items: CompletenessItem[]
}

interface Check {
  id: string
  label: string
  targetId?: string
  done: (business: ProfileCompletenessInput) => boolean
}

const CORE_CHECKS: Check[] = [
  {
    id: 'website',
    label: 'Website',
    targetId: 'website-url',
    done: (business) => hasText(business.websiteUrl),
  },
  {
    id: 'contact-email',
    label: 'Contact email',
    targetId: 'contact-email',
    done: (business) => hasText(business.contactEmail),
  },
  {
    id: 'review-link',
    label: 'Review link',
    targetId: 'review-url',
    done: (business) => hasText(business.reviewUrl),
  },
]

const PRO_SITE_CHECK: Check = {
  id: 'pro-site',
  label: 'ProSite',
  done: (business) => business.proSiteEnabled === true,
}

/** Included only when the matching key is an own property of the record. */
const OPTIONAL_CHECKS: Array<Check & { key: 'imageUrl' | 'about' | 'services' | 'hours' }> = [
  {
    key: 'imageUrl',
    id: 'photo',
    label: 'Photo',
    targetId: 'listing-photo',
    done: (business) => hasText(business.imageUrl),
  },
  {
    key: 'about',
    id: 'about',
    label: 'About',
    targetId: 'about',
    done: (business) => hasText(business.about),
  },
  {
    key: 'services',
    id: 'services',
    label: 'Services',
    targetId: 'services',
    done: (business) => hasServices(business.services),
  },
  {
    key: 'hours',
    id: 'hours',
    label: 'Hours',
    targetId: 'hours',
    done: (business) => Array.isArray(business.hours) && business.hours.length > 0,
  },
]

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasServices(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => hasText(item))
}

function hasOwn(business: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(business, key)
}

function toItem(check: Check, business: ProfileCompletenessInput): CompletenessItem {
  return {
    id: check.id,
    label: check.label,
    done: check.done(business),
    ...(check.targetId ? { targetId: check.targetId } : {}),
  }
}

export function computeCompleteness(business: ProfileCompletenessInput): Completeness {
  const items = CORE_CHECKS.map((check) => toItem(check, business))

  for (const check of OPTIONAL_CHECKS) {
    if (hasOwn(business, check.key)) items.push(toItem(check, business))
  }

  items.push(toItem(PRO_SITE_CHECK, business))

  const doneCount = items.filter((item) => item.done).length
  const score = items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100)

  return { score, items }
}
