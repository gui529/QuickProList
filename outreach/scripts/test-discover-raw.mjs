import { loadEnv } from '../src/env.ts'
import { buildDiscoverySearchPhrase } from '../src/cursor-discovery.ts'
import { runCursorAgentPrint, extractJsonObject } from '../src/cursor-agent.ts'
import { createEphemeralAgentWorkspace } from '../src/agent-workspace.ts'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'

loadEnv()
const phrase = buildDiscoverySearchPhrase('Acworth, GA', 'Plumbers')
const prompt = [
  phrase,
  'Use web search on the public internet (not a local codebase).',
  'Find independent local businesses. Only include entries with a contact email visible on a public website or listing — never guess emails. Max 12.',
  'Reply with ONLY raw JSON, no markdown: {"businesses":[{"businessName":"","email":"","phone":"","website":"","notes":""}]} or {"businesses":[]}.',
].join(' ')

const ws = createEphemeralAgentWorkspace()
const r = await runCursorAgentPrint({ prompt, workspace: ws, timeoutMs: 300000, sandbox: 'disabled' })
console.log('ws', ws)
const out = resolve(dirname(fileURLToPath(import.meta.url)), 'last-agent-result.txt')
writeFileSync(out, r.result, 'utf8')
console.log('wrote', out, 'len', r.result.length)
try {
  console.log('parse ok', extractJsonObject(r.result))
} catch (e) {
  console.log('parse fail', e.message)
}
