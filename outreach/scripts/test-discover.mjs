import { loadEnv } from '../src/env.ts'
import { discoverProspectsViaCursor } from '../src/cursor-discovery.ts'

loadEnv()

try {
  const r = await discoverProspectsViaCursor('Acworth, GA', 'Plumbers')
  console.log('query:', r.query)
  console.log('found:', r.prospects.length)
  for (const p of r.prospects.slice(0, 5)) {
    console.log('-', p.businessName, p.email)
  }
} catch (e) {
  console.error('FAIL:', e.message)
  process.exit(1)
}
