import { runCursorAgentPrint, extractJsonObject } from '../src/cursor-agent.ts'

const prompt =
  'Reply with ONLY raw JSON: {"businesses":[{"businessName":"Test Co","email":"test@example.com","phone":"","website":"","notes":"demo"}]}'

try {
  const r = await runCursorAgentPrint({
    prompt,
    workspace: 'c:/Projects/QuickProList',
    timeoutMs: 120000,
  })
  console.log('envelope result length:', r.result.length)
  console.log('preview:', r.result.slice(0, 400))
  const parsed = extractJsonObject(r.result)
  console.log('parsed businesses:', parsed)
} catch (e) {
  console.error('FAIL:', e.message)
  process.exit(1)
}
