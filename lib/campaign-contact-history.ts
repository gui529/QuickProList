import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadSentRegistry, type SentRegistryEntry } from './campaign-sent-registry'
import { normalizeEmail } from './suppressions'

export const GMAIL_SENT_LOG_RELATIVE_PATH = 'docs/campaigns/gmail-sent-log.json'

export interface GmailSentEntry {
  email: string
  businessName: string
  /** America/New_York timestamp, ISO-8601 with offset. */
  sentAtEt: string
  gmailMessageId: string
  city?: string
  category?: string
}

export interface GmailSentLog {
  version: 1
  sent: GmailSentEntry[]
}

export function gmailSentLogPath(repoRoot = process.cwd()): string {
  return resolve(repoRoot, GMAIL_SENT_LOG_RELATIVE_PATH)
}

export function loadGmailSentLog(repoRoot = process.cwd()): GmailSentLog {
  const path = gmailSentLogPath(repoRoot)
  if (!existsSync(path)) return { version: 1, sent: [] }
  const raw = JSON.parse(readFileSync(path, 'utf8')) as GmailSentLog
  if (raw.version !== 1 || !Array.isArray(raw.sent)) {
    throw new Error(`Invalid Gmail sent log: ${GMAIL_SENT_LOG_RELATIVE_PATH}`)
  }
  return raw
}

export function normalizeBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function emailDomain(email: string): string | null {
  const normalized = normalizeEmail(email)
  const at = normalized.lastIndexOf('@')
  if (at < 1 || at === normalized.length - 1) return null
  return normalized.slice(at + 1)
}

export interface PriorContact {
  match: 'email' | 'domain_business'
  source: 'resend' | 'gmail'
  email: string
  businessName: string
  when: string
}

export function findPriorContact(
  email: string,
  businessName: string,
  history: { resend: SentRegistryEntry[]; gmail: GmailSentEntry[] }
): PriorContact | null {
  const normalized = normalizeEmail(email)
  const domain = emailDomain(normalized)
  const business = normalizeBusinessName(businessName)

  for (const row of history.resend) {
    if (normalizeEmail(row.email) === normalized) {
      return {
        match: 'email',
        source: 'resend',
        email: row.email,
        businessName: row.businessName,
        when: row.sentAt,
      }
    }
  }
  for (const row of history.gmail) {
    if (normalizeEmail(row.email) === normalized) {
      return {
        match: 'email',
        source: 'gmail',
        email: row.email,
        businessName: row.businessName,
        when: row.sentAtEt,
      }
    }
  }

  if (domain && business) {
    for (const row of history.resend) {
      if (emailDomain(row.email) === domain && normalizeBusinessName(row.businessName) === business) {
        return {
          match: 'domain_business',
          source: 'resend',
          email: row.email,
          businessName: row.businessName,
          when: row.sentAt,
        }
      }
    }
    for (const row of history.gmail) {
      if (emailDomain(row.email) === domain && normalizeBusinessName(row.businessName) === business) {
        return {
          match: 'domain_business',
          source: 'gmail',
          email: row.email,
          businessName: row.businessName,
          when: row.sentAtEt,
        }
      }
    }
  }

  return null
}

export function priorContactMessage(email: string, prior: PriorContact): string {
  return `REFUSED already contacted: ${normalizeEmail(email)} matches ${prior.source} history via ${prior.match} (${prior.email}, ${prior.businessName}, ${prior.when}).`
}

export function formatDateTimeEt(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  })
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
  const offset = (parts.timeZoneName ?? 'GMT-05:00').replace('GMT', '')
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`
}

export function loadContactHistory(repoRoot = process.cwd()): {
  resend: SentRegistryEntry[]
  gmail: GmailSentEntry[]
} {
  return {
    resend: loadSentRegistry(repoRoot).sent,
    gmail: loadGmailSentLog(repoRoot).sent,
  }
}

export function recordGmailSend(
  entry: GmailSentEntry,
  options: { force?: boolean; repoRoot?: string; now?: Date } = {}
): GmailSentEntry {
  const repoRoot = options.repoRoot ?? process.cwd()
  const prior = findPriorContact(entry.email, entry.businessName, loadContactHistory(repoRoot))
  if (prior && !options.force) {
    throw new Error(priorContactMessage(entry.email, prior))
  }
  const log = loadGmailSentLog(repoRoot)
  const row: GmailSentEntry = {
    ...entry,
    email: entry.email.trim(),
    businessName: entry.businessName.trim(),
    sentAtEt: entry.sentAtEt || formatDateTimeEt(options.now ?? new Date()),
    gmailMessageId: entry.gmailMessageId.trim(),
  }
  log.sent.push(row)
  writeFileSync(gmailSentLogPath(repoRoot), `${JSON.stringify(log, null, 2)}\n`, 'utf8')
  return row
}
