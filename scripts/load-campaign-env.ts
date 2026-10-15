import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnvLocal } from './load-env-local'

/** Load `.env.local`, then override with `.env.campaign-send.local` (e.g. vercel env pull). */
export function loadCampaignEnv(): void {
  loadEnvLocal()
  const path = resolve(import.meta.dirname, '..', '.env.campaign-send.local')
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
    process.env[key] = val
  }
}
