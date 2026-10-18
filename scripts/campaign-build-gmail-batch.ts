/**
 * Rebuild docs/campaigns/gmail-test-batch.json from the prospect registry,
 * Resend sent-registry statuses, the Gmail sent log, and live DNS MX lookups.
 *
 *   npx tsx scripts/campaign-build-gmail-batch.ts
 */
import { writeFileSync } from 'node:fs'
import { resolveMx } from 'node:dns/promises'
import { resolve } from 'node:path'
import { loadContactHistory, emailDomain } from '../lib/campaign-contact-history'
import { loadProspectRegistry } from '../lib/campaign-prospect-registry'
import { buildGmailTestBatch } from '../lib/gmail-test-batch'
import { campaignPostalAddress } from '../lib/email'

async function mxFor(domain: string): Promise<boolean | null> {
  try {
    const records = await resolveMx(domain)
    return records.length > 0
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ESERVFAIL') return false
    console.error(`MX lookup failed for ${domain} (${code ?? 'unknown'})`)
    return null
  }
}

async function main() {
  const registry = loadProspectRegistry()
  const history = loadContactHistory()
  const domains = new Set<string>()
  for (const prospect of registry.prospects) {
    if (!prospect.email) continue
    const domain = emailDomain(prospect.email)
    if (domain) domains.add(domain)
  }
  const mxByDomain: Record<string, boolean> = {}
  for (const domain of domains) {
    const mx = await mxFor(domain)
    if (mx !== null) mxByDomain[domain] = mx
  }
  const batch = buildGmailTestBatch({
    prospects: registry.prospects,
    resend: history.resend,
    gmail: history.gmail,
    mxByDomain,
    postalAddress: campaignPostalAddress(),
  })
  const path = resolve(process.cwd(), 'docs/campaigns/gmail-test-batch.json')
  writeFileSync(path, `${JSON.stringify(batch, null, 2)}\n`, 'utf8')
  console.log(
    JSON.stringify({
      path,
      sendReady: batch.sendReady.length,
      flagged: batch.flagged.length,
      excluded: batch.excluded.length,
      needsEmail: batch.needsEmail.length,
      readyToSend: batch.readyToSend,
    })
  )
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
