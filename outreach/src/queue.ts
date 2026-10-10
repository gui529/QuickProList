import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

export type QueueStatus = 'pending_review' | 'approved' | 'rejected' | 'sent' | 'failed'

export interface QueueProspect {
  id: string
  businessName: string
  email: string
  phone?: string
  website?: string
  category: string
  city: string
  status: QueueStatus
  discoveryNotes?: string
  searchQuery?: string
  sentAt?: string
  errorMessage?: string
  createdAt: string
}

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const queuePath = resolve(dataDir, 'queue.json')

function ensureDataDir() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
}

function readAll(): QueueProspect[] {
  ensureDataDir()
  if (!existsSync(queuePath)) return []
  return JSON.parse(readFileSync(queuePath, 'utf8')) as QueueProspect[]
}

function writeAll(rows: QueueProspect[]) {
  ensureDataDir()
  writeFileSync(queuePath, JSON.stringify(rows, null, 2), 'utf8')
}

export function listQueue(status?: QueueStatus): QueueProspect[] {
  const rows = readAll()
  if (!status) {
    return rows.filter((r) => r.status !== 'rejected').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return rows.filter((r) => r.status === status)
}

export function getById(id: string): QueueProspect | undefined {
  const rows = readAll()
  const exact = rows.find((r) => r.id === id)
  if (exact) return exact
  if (id.length >= 8) return rows.find((r) => r.id.startsWith(id))
  return undefined
}

function emailTaken(email: string, rows: QueueProspect[]): boolean {
  const key = email.trim().toLowerCase()
  return rows.some(
    (r) => r.email.toLowerCase() === key && r.status !== 'rejected' && r.status !== 'failed'
  )
}

export function addFromDiscovery(input: {
  businessName: string
  email: string
  phone?: string
  website?: string
  category: string
  city: string
  discoveryNotes?: string
  searchQuery?: string
}): QueueProspect | null {
  const rows = readAll()
  if (emailTaken(input.email, rows)) return null
  const row: QueueProspect = {
    id: randomUUID(),
    businessName: input.businessName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone,
    website: input.website,
    category: input.category.trim(),
    city: input.city.trim(),
    status: 'pending_review',
    discoveryNotes: input.discoveryNotes,
    searchQuery: input.searchQuery,
    createdAt: new Date().toISOString(),
  }
  rows.push(row)
  writeAll(rows)
  return row
}

export function setStatus(
  id: string,
  status: QueueStatus,
  extra?: { errorMessage?: string }
): QueueProspect | null {
  const rows = readAll()
  const i = rows.findIndex((r) => r.id === id)
  if (i === -1) return null
  rows[i] = {
    ...rows[i],
    status,
    errorMessage: extra?.errorMessage,
    sentAt: status === 'sent' ? new Date().toISOString() : rows[i].sentAt,
  }
  writeAll(rows)
  return rows[i]
}
