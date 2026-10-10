import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv, apiBaseUrl } from './env.ts'
import { buildDiscoverySearchPhrase } from './cursor-discovery.ts'
import { discoverProspectsInArea, discoveryProvider, resolveDiscoveryTrade } from './discovery.ts'
import { pushProspectsToApp } from './push-via-app.ts'
import { OPEN_TOWNS, OPEN_AREA_STATE } from './open-towns.ts'
import { CATEGORIES } from './categories.ts'

loadEnv()

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = resolve(root, 'public')
const port = Number(process.env.OUTREACH_DASHBOARD_PORT ?? '3847')
const host = '127.0.0.1'

function json(res: import('node:http').ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  return JSON.parse(raw) as unknown
}

function serveIndex(res: import('node:http').ServerResponse) {
  const path = resolve(publicDir, 'index.html')
  if (!existsSync(path)) {
    res.writeHead(404)
    res.end('Missing public/index.html')
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(readFileSync(path, 'utf8'))
}

async function handleDiscover(body: { city?: string; category?: string }) {
  const city = body.city?.trim()
  const category = body.category?.trim()
  if (!city || !category) throw new Error('city and category are required')

  const trade = resolveDiscoveryTrade(category)
  if (discoveryProvider() === 'cursor') {
    const phrase = buildDiscoverySearchPhrase(city, trade.label)
    console.log(`[discover] agent -p --trust "${phrase}"`)
  }
  const discovery = await discoverProspectsInArea(city, trade.value)
  const { prospects, query } = discovery
  const warning = 'warning' in discovery ? discovery.warning : undefined
  const agentPreview = 'agentPreview' in discovery ? discovery.agentPreview : undefined

  const push = await pushProspectsToApp(
    prospects.map((p) => ({
      businessName: p.businessName,
      email: p.email,
      phone: p.phone,
      website: p.website,
      category: trade.value,
      city,
      discoveryNotes: p.notes,
      searchQuery: query,
    }))
  )

  return {
    query,
    found: prospects.length,
    added: push.added ?? 0,
    skipped: push.skipped ?? 0,
    prospects: push.prospects ?? [],
    warning,
    agentPreview,
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${host}`)
  const path = url.pathname

  try {
    if (req.method === 'GET' && path === '/') {
      serveIndex(res)
      return
    }

    if (req.method === 'GET' && path === '/api/meta') {
      json(res, 200, {
        towns: OPEN_TOWNS.map((t) => `${t.name}, ${OPEN_AREA_STATE}`),
        categories: CATEGORIES.map((c) => ({ label: c.label, value: c.value })),
        apiBaseUrl: apiBaseUrl(),
        autoSendEnabled: process.env.CAMPAIGN_AUTO_SEND_ENABLED === 'true',
        discoveryProvider: discoveryProvider(),
      })
      return
    }

    if (req.method === 'GET' && path === '/api/discover-preview') {
      const city = url.searchParams.get('city')?.trim() ?? ''
      const category = url.searchParams.get('category')?.trim() ?? ''
      const trade = resolveDiscoveryTrade(category)
      const phrase =
        discoveryProvider() === 'cursor'
          ? buildDiscoverySearchPhrase(city, trade.label)
          : `${trade.term} ${city} GA contact email`
      json(res, 200, {
        phrase,
        command: discoveryProvider() === 'cursor' ? `agent -p --trust "${phrase}"` : `(serper) ${phrase}`,
      })
      return
    }

    if (req.method === 'POST' && path === '/api/discover') {
      const body = (await readBody(req)) as { city?: string; category?: string }
      json(res, 200, await handleDiscover(body))
      return
    }

    json(res, 404, { error: 'Not found' })
  } catch (err) {
    console.error(err)
    json(res, 500, { error: err instanceof Error ? err.message : String(err) })
  }
})

server.listen(port, host, () => {
  console.log('QuickProList Outreach — discovery worker (pushes to API)')
  console.log(`  http://${host}:${port}`)
  console.log(`  API target: ${apiBaseUrl()} — review in Admin → Campaigns → Queue`)
})
