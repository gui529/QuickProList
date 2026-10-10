import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DiscoveredProspect } from './discovery.ts'
import { createEphemeralAgentWorkspace } from './agent-workspace.ts'
import { extractJsonObject, runCursorAgentPrint } from './cursor-agent.ts'

/** Plain phrase passed to `agent -p` (shown in the dashboard as the “query”). */
export function buildDiscoverySearchPhrase(city: string, tradeLabel: string): string {
  const place = city.trim()
  const trade = tradeLabel.trim().toLowerCase()
  return `Search me ${trade} in ${place}`
}

function buildDiscoveryPrompt(searchPhrase: string): string {
  return [
    searchPhrase,
    'Use web search on the public internet (not a local codebase).',
    'Find independent local businesses. Only include entries with a contact email visible on a public website or listing — never guess emails. Max 12.',
    'Reply with ONLY raw JSON, no markdown: {"businesses":[{"businessName":"","email":"","phone":"","website":"","notes":""}]} or {"businesses":[]}.',
  ].join(' ')
}

const MIN_REPAIR_CHARS = 400

function buildJsonRepairPrompt(searchPhrase: string, researchText: string): string {
  return [
    searchPhrase,
    'Read the research notes below (from a prior web search).',
    'Reply with ONLY raw JSON — no markdown: {"businesses":[{"businessName":"","email":"","phone":"","website":"","notes":""}]}',
    'Only include businesses whose email appears in the notes. Otherwise {"businesses":[]}.',
    '---NOTES---',
    researchText.slice(0, 14_000),
  ].join('\n')
}

function shouldAttemptJsonRepair(result: string): boolean {
  const text = result.trim()
  if (text.length < MIN_REPAIR_CHARS) return false
  if (parseAgentBusinesses(text)) return false
  return /@|businesses|plumber|electric|hvac|\.com/i.test(text)
}

function parseAgentBusinesses(result: string): { businesses: unknown[] } | null {
  try {
    const raw = extractJsonObject(result)
    if (!raw || typeof raw !== 'object') return null
    const businesses = (raw as { businesses?: unknown }).businesses
    if (!Array.isArray(businesses)) return null
    return { businesses }
  } catch {
    return null
  }
}

function normalizeProspects(raw: unknown): DiscoveredProspect[] {
  if (!raw || typeof raw !== 'object') return []
  const businesses = (raw as { businesses?: unknown }).businesses
  if (!Array.isArray(businesses)) return []

  const out: DiscoveredProspect[] = []
  for (const row of businesses) {
    if (!row || typeof row !== 'object') continue
    const b = row as Record<string, unknown>
    const businessName = String(b.businessName ?? '').trim()
    const email = String(b.email ?? '').trim().toLowerCase()
    if (!businessName || !email.includes('@')) continue
    out.push({
      businessName: businessName.slice(0, 120),
      email,
      phone: String(b.phone ?? '').trim() || undefined,
      website: String(b.website ?? '').trim() || undefined,
      notes: String(b.notes ?? '').trim() || 'Found via Cursor agent web search',
    })
  }
  return out
}

export type CursorDiscoveryResult = {
  prospects: DiscoveredProspect[]
  query: string
  agentPrompt: string
  warning?: string
  agentPreview?: string
}

export async function discoverProspectsViaCursor(
  city: string,
  tradeLabel: string
): Promise<CursorDiscoveryResult> {
  const query = buildDiscoverySearchPhrase(city, tradeLabel)
  const prompt = buildDiscoveryPrompt(query)

  const agentWorkspace =
    process.env.OUTREACH_CURSOR_WORKSPACE?.trim() || createEphemeralAgentWorkspace()

  const { result } = await runCursorAgentPrint({
    prompt,
    workspace: agentWorkspace,
    mode: process.env.OUTREACH_CURSOR_MODE === 'ask' ? 'ask' : undefined,
    sandbox: 'disabled',
  })

  let parsed = parseAgentBusinesses(result)
  let repairNote: string | undefined

  if (!parsed && shouldAttemptJsonRepair(result)) {
    try {
      const repair = await runCursorAgentPrint({
        prompt: buildJsonRepairPrompt(query, result),
        workspace: agentWorkspace,
        sandbox: 'disabled',
      })
      parsed = parseAgentBusinesses(repair.result)
      if (!parsed) {
        repairNote = 'Could not structure agent output as JSON.'
      }
    } catch {
      repairNote = 'Follow-up JSON pass failed.'
    }
  }

  if (!parsed) {
    if (!result.trim()) {
      throw new Error(
        'Cursor agent returned an empty message. Try agent login, set CURSOR_API_KEY, or OUTREACH_DISCOVERY=serper.'
      )
    }
    parsed = { businesses: [] }
  }

  const prospects = normalizeProspects(parsed)

  const seen = new Set<string>()
  const deduped: DiscoveredProspect[] = []
  for (const p of prospects) {
    if (seen.has(p.email)) continue
    seen.add(p.email)
    deduped.push(p)
  }

  let warning: string | undefined = repairNote
  const preview = result.trim().slice(0, 400)
  if (deduped.length === 0) {
    if (/missing_input|no research text/i.test(result)) {
      warning =
        'Cursor agent did not return prospect JSON. Run: npx tsx outreach/scripts/enable-cursor-web-for-outreach.mjs then try again, or set OUTREACH_DISCOVERY=serper.'
    } else if (/web search was blocked|network.*blocked|can't run a live search/i.test(result)) {
      warning =
        'Cursor CLI could not use web search from this process. Add WebFetch(*) under permissions.allow in ~/.cursor/cli-config.json (or use outreach/.cursor/cli.json), run agent login, or set OUTREACH_DISCOVERY=serper with SERPER_API_KEY.'
    } else if (/quickprolist\.com|curated_businesses|\/api\/search/i.test(result)) {
      warning =
        'The agent answered about QuickProList in-app search instead of finding new prospects on the web. Restart the dashboard after updating outreach; if it persists, set OUTREACH_DISCOVERY=serper.'
    } else if (result.trim()) {
      warning = 'Agent returned no businesses with verified emails.'
    }
  }

  return { prospects: deduped, query, agentPrompt: prompt, warning, agentPreview: preview || undefined }
}
