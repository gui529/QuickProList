import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { findPriorContact, priorContactMessage, type GmailSentEntry } from './campaign-contact-history'
import type { SentRegistryEntry } from './campaign-sent-registry'
import { isRoleAddress } from './gmail-campaign'
import { normalizeEmail } from './suppressions'

export const PROSPECTS_REGISTRY_RELATIVE_PATH = 'docs/campaigns/prospects-registry.json'

export interface ProspectRecord {
  businessName: string
  email: string | null
  city: string
  category: string
  /**
   * Where the contact data came from. Gmail batches allow only
   * own_site, chamber, ga_sos, and ga_license. See docs/prospect-sources.md.
   */
  source?: string | null
  status: string
  curatedId?: string
  websiteUrl?: string | null
  emailSource?: string
  skipReason?: string
  roleAddress?: boolean
}

export interface ProspectRegistry {
  version: 1
  updatedAt: string
  prospects: ProspectRecord[]
}

export interface CuratedProspectRow {
  id: string
  name: string
  category: string
  cities: string[]
  contact_email: string | null
  website_url: string | null
}

const KEPT_STATUSES = new Set(['sent', 'skip', 'replied', 'declined', 'subscribed'])

export function prospectsRegistryPath(repoRoot = process.cwd()): string {
  return resolve(repoRoot, PROSPECTS_REGISTRY_RELATIVE_PATH)
}

export function loadProspectRegistry(repoRoot = process.cwd()): ProspectRegistry {
  const path = prospectsRegistryPath(repoRoot)
  if (!existsSync(path)) return { version: 1, updatedAt: new Date(0).toISOString(), prospects: [] }
  const raw = JSON.parse(readFileSync(path, 'utf8')) as ProspectRegistry
  if (raw.version !== 1 || !Array.isArray(raw.prospects)) {
    throw new Error(`Invalid prospects registry: ${PROSPECTS_REGISTRY_RELATIVE_PATH}`)
  }
  return raw
}

export function saveProspectRegistry(registry: ProspectRegistry, repoRoot = process.cwd()): void {
  writeFileSync(prospectsRegistryPath(repoRoot), `${JSON.stringify(registry, null, 2)}\n`, 'utf8')
}

function sameProspect(a: ProspectRecord, b: { businessName: string; city: string; category: string }): boolean {
  return (
    a.businessName.trim().toLowerCase() === b.businessName.trim().toLowerCase() &&
    a.city.trim().toLowerCase() === b.city.trim().toLowerCase() &&
    a.category.trim().toLowerCase() === b.category.trim().toLowerCase()
  )
}

/**
 * Upsert published listings into the registry without wiping discovered emails
 * or terminal statuses (`sent`, `skip`, replies).
 */
export function mergeCuratedProspects(
  existing: ProspectRecord[],
  rows: CuratedProspectRow[]
): ProspectRecord[] {
  const byCurated = new Map(existing.filter((p) => p.curatedId).map((p) => [p.curatedId as string, p]))
  const byEmail = new Map(
    existing.filter((p) => p.email).map((p) => [normalizeEmail(p.email as string), p])
  )
  const consumed = new Set<ProspectRecord>()
  const merged: ProspectRecord[] = []

  for (const row of rows) {
    const email = row.contact_email?.trim() ? normalizeEmail(row.contact_email) : null
    const prior = byCurated.get(row.id) ?? (email ? byEmail.get(email) : undefined)
    if (prior) consumed.add(prior)
    const keepStatus = Boolean(prior && KEPT_STATUSES.has(prior.status))
    const nextEmail = email ?? prior?.email ?? null
    let status = 'needs_email'
    if (keepStatus && prior) status = prior.status
    else if (nextEmail) status = prior?.status === 'needs_email' || !prior ? 'pending' : prior.status
    const next: ProspectRecord = {
      businessName: row.name,
      email: nextEmail,
      city: row.cities[0] ?? prior?.city ?? 'atlanta',
      category: row.category,
      source: prior?.source ?? 'curated',
      status,
      curatedId: row.id,
      websiteUrl: row.website_url ?? prior?.websiteUrl ?? null,
    }
    if (prior?.emailSource) next.emailSource = prior.emailSource
    if (keepStatus && prior?.skipReason) next.skipReason = prior.skipReason
    if (prior?.roleAddress) next.roleAddress = true
    merged.push(next)
  }

  for (const prospect of existing) {
    if (!consumed.has(prospect)) merged.push(prospect)
  }
  return merged
}

export interface AddProspectInput {
  businessName: string
  email: string
  city: string
  category: string
  sourceUrl: string
  websiteUrl?: string
  source?: string
}

export function addProspectToRegistry(
  registry: ProspectRegistry,
  input: AddProspectInput,
  options: {
    now?: string
    history?: { resend: SentRegistryEntry[]; gmail: GmailSentEntry[] }
  } = {}
): ProspectRecord {
  const businessName = input.businessName.trim()
  const email = normalizeEmail(input.email)
  const city = input.city.trim()
  const category = input.category.trim()
  const sourceUrl = input.sourceUrl.trim()
  if (!businessName || !city || !category || !sourceUrl) {
    throw new Error('business, email, city, category, and source URL are required')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Invalid email: ${input.email}`)
  }

  const duplicate = registry.prospects.find(
    (prospect) =>
      (prospect.email && normalizeEmail(prospect.email) === email) ||
      sameProspect(prospect, { businessName, city, category })
  )
  if (duplicate) {
    throw new Error(
      `Duplicate prospect: ${duplicate.businessName} (${duplicate.email ?? 'no email'}) is already in the registry.`
    )
  }

  if (options.history) {
    const history = options.history
    const prior = findPriorContact(email, businessName, history)
    if (prior) throw new Error(priorContactMessage(email, prior))
  }

  const prospect: ProspectRecord = {
    businessName,
    email,
    city,
    category,
    source: input.source ?? 'manual',
    status: 'pending',
    websiteUrl: input.websiteUrl?.trim() || null,
    emailSource: sourceUrl,
    ...(isRoleAddress(email) ? { roleAddress: true } : {}),
  }
  registry.prospects.push(prospect)
  registry.updatedAt = options.now ?? new Date().toISOString()
  return prospect
}
