import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const outreachRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(outreachRoot, '..')

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

export function loadEnv() {
  loadEnvFile(resolve(repoRoot, '.env.local'))
  loadEnvFile(resolve(outreachRoot, '.env'))
  loadEnvFile(resolve(outreachRoot, '.env.local'))
}

export function apiBaseUrl(): string {
  const url = process.env.OUTREACH_API_URL?.trim() || process.env.SITE_URL?.trim() || 'http://localhost:3000'
  return url.replace(/\/$/, '')
}

export function outreachSecret(): string {
  const s = process.env.CAMPAIGN_OUTREACH_SECRET?.trim()
  if (!s) throw new Error('CAMPAIGN_OUTREACH_SECRET is required (see .env.example)')
  return s
}
