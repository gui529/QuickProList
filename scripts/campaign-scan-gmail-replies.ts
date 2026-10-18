/**
 * Record Gmail reply opt-outs on the shared suppressions table.
 * Reads a fixture file or the inbox (HTTP GET only). Never sends.
 *
 * Run at least every 5 business days so a reply is recorded inside
 * CAN-SPAM's 10 business days. The lookback is 30 calendar days.
 *
 *   npx tsx scripts/campaign-scan-gmail-replies.ts --fixture replies.json
 *   npx tsx scripts/campaign-scan-gmail-replies.ts --fixture replies.json --apply
 *   npx tsx scripts/campaign-scan-gmail-replies.ts --read-inbox
 *   npx tsx scripts/campaign-scan-gmail-replies.ts --read-inbox --apply
 *
 * Without --apply this prints the addresses and does not write.
 * --apply calls addSuppression(..., 'reply_opt_out') in lib/suppressions.ts,
 * the same table Resend marketing sends check.
 */
import { readFileSync } from 'node:fs'
import { loadCampaignEnv } from './load-campaign-env'
import {
  readGmailInboxReplies,
  recordReplyOptOuts,
  replyScanSince,
  type InboundGmailReply,
} from '../lib/gmail-campaign'
import { addSuppression } from '../lib/suppressions'

loadCampaignEnv()

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  if (index === -1 || index + 1 >= process.argv.length) return undefined
  return process.argv[index + 1]
}

async function loadReplies(): Promise<InboundGmailReply[]> {
  const fixture = arg('--fixture')
  if (fixture) {
    const parsed = JSON.parse(readFileSync(fixture, 'utf8')) as InboundGmailReply[]
    if (!Array.isArray(parsed)) throw new Error('--fixture must be a JSON array of replies')
    return parsed
  }
  if (!process.argv.includes('--read-inbox')) return []
  const accessToken = process.env.GMAIL_ACCESS_TOKEN?.trim()
  if (!accessToken) throw new Error('GMAIL_ACCESS_TOKEN is required for --read-inbox')
  return readGmailInboxReplies({ accessToken, since: replyScanSince(new Date()) })
}

async function main() {
  const replies = await loadReplies()
  if (!arg('--fixture') && !process.argv.includes('--read-inbox')) {
    console.log(
      JSON.stringify({
        read: false,
        wrote: false,
        note: 'Pass --fixture or --read-inbox. This command never sends mail.',
      })
    )
    return
  }
  const apply = process.argv.includes('--apply')
  const result = await recordReplyOptOuts(
    replies,
    apply
      ? { addSuppression }
      : {
          addSuppression: async () => {
            // Dry-run records nothing.
          },
        }
  )
  console.log(JSON.stringify({ apply, wrote: apply, ...result }))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
