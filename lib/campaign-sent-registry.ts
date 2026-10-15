import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeEmail } from './suppressions'

/** Canonical log of campaign emails already sent (campaign-manager dedupe). */
export const SENT_REGISTRY_RELATIVE_PATH = 'docs/campaigns/sent-registry.json'

export interface SentRegistryEntry {
  email: string
  businessName: string
  city: string
  category: string
  batch: string
  resendId: string
  subject: string
  /** ISO-8601 */
  sentAt: string
  wave?: 'listed' | 'outreach' | 'test' | 'follow-up'
  notes?: string
}

export interface SentRegistry {
  version: 1
  sent: SentRegistryEntry[]
}

export function sentRegistryPath(repoRoot = process.cwd()): string {
  return resolve(repoRoot, SENT_REGISTRY_RELATIVE_PATH)
}

export function loadSentRegistry(repoRoot = process.cwd()): SentRegistry {
  const path = sentRegistryPath(repoRoot)
  if (!existsSync(path)) return { version: 1, sent: [] }
  const raw = JSON.parse(readFileSync(path, 'utf8')) as SentRegistry
  if (raw.version !== 1 || !Array.isArray(raw.sent)) {
    throw new Error(`Invalid sent registry: ${SENT_REGISTRY_RELATIVE_PATH}`)
  }
  return raw
}

export function findSentByEmail(email: string, repoRoot = process.cwd()): SentRegistryEntry | undefined {
  const key = normalizeEmail(email)
  return loadSentRegistry(repoRoot).sent.find((e) => normalizeEmail(e.email) === key)
}

export function listSentEmails(repoRoot = process.cwd()): string[] {
  return loadSentRegistry(repoRoot).sent.map((e) => normalizeEmail(e.email))
}

/** Insert or, with `force`, replace the row for this email. */
export function recordSent(
  entry: SentRegistryEntry,
  options: { force?: boolean } = {},
  repoRoot = process.cwd()
): void {
  const key = normalizeEmail(entry.email)
  const reg = loadSentRegistry(repoRoot)
  const idx = reg.sent.findIndex((e) => normalizeEmail(e.email) === key)
  const row = { ...entry, email: entry.email.trim() }
  if (idx >= 0) {
    if (!options.force) {
      throw new Error(`Campaign already sent to ${key} (see ${SENT_REGISTRY_RELATIVE_PATH})`)
    }
    reg.sent[idx] = row
  } else {
    reg.sent.push(row)
  }
  writeFileSync(sentRegistryPath(repoRoot), `${JSON.stringify(reg, null, 2)}\n`, 'utf8')
}

/** @deprecated Use recordSent */
export function appendSentRecord(entry: SentRegistryEntry, repoRoot = process.cwd()): void {
  recordSent(entry, {}, repoRoot)
}
