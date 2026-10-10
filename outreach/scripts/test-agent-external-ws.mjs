import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runCursorAgentPrint, extractJsonObject } from '../src/cursor-agent.ts'

const ws = mkdtempSync(join(tmpdir(), 'qpl-outreach-'))
const prompt = [
  'Use web search on the internet.',
  'Search me plumbers in Acworth, Georgia.',
  'Find businesses with public contact emails. No guessing.',
  'Reply ONLY JSON: {"businesses":[{"businessName":"x","email":"a@b.com","phone":"","website":"","notes":""}]} or {"businesses":[]}',
].join(' ')

const r = await runCursorAgentPrint({ prompt, workspace: ws, sandbox: 'disabled', timeoutMs: 300000 })
console.log('workspace', ws)
console.log('len', r.result.length)
console.log(r.result.slice(0, 800))
try {
  console.log('parsed count', extractJsonObject(r.result))
} catch (e) {
  console.log('parse', e.message)
}
