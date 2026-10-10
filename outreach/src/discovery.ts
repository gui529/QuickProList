import { CATEGORIES, normalizeCategory } from './categories.ts'
import { discoverProspectsViaCursor } from './cursor-discovery.ts'
import { formatCityLabel, isOpenTown } from './open-towns.ts'

export type DiscoveryProvider = 'cursor' | 'serper'

export function discoveryProvider(): DiscoveryProvider {
  const raw = (process.env.OUTREACH_DISCOVERY ?? 'cursor').trim().toLowerCase()
  if (raw === 'serper') return 'serper'
  return 'cursor'
}

export interface DiscoveredProspect {
  businessName: string
  email: string
  phone?: string
  website?: string
  notes?: string
}

interface SerperOrganic {
  title?: string
  link?: string
  snippet?: string
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

function extractEmailsFromText(text: string): string[] {
  const found = text.match(EMAIL_RE) ?? []
  return [...new Set(found.map((e) => e.toLowerCase()))].filter(
    (e) => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com')
  )
}

async function serperSearch(query: string): Promise<SerperOrganic[]> {
  const key = process.env.SERPER_API_KEY?.trim()
  if (!key) throw new Error('SERPER_API_KEY not configured')
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: 12 }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Serper search failed: ${res.status} ${text.slice(0, 200)}`)
  }
  const data = (await res.json()) as { organic?: SerperOrganic[] }
  return data.organic ?? []
}

async function structureProspectsWithOpenAI(
  cityLabel: string,
  tradeLabel: string,
  organic: SerperOrganic[]
): Promise<DiscoveredProspect[]> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('OPENAI_API_KEY not configured')

  const context = organic
    .map((o, i) => `${i + 1}. ${o.title ?? ''}\n${o.snippet ?? ''}\n${o.link ?? ''}`)
    .join('\n\n')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.CAMPAIGN_DISCOVERY_MODEL?.trim() || 'gpt-4o-mini',
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'prospect_list',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              businesses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    businessName: { type: 'string' },
                    email: { type: 'string' },
                    phone: { type: 'string' },
                    website: { type: 'string' },
                    notes: { type: 'string' },
                  },
                  required: ['businessName', 'email', 'phone', 'website', 'notes'],
                  additionalProperties: false,
                },
              },
            },
            required: ['businesses'],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: 'system',
          content:
            'You extract local home-service businesses for outreach. Only include a business if its email address appears verbatim in the provided search snippets. Do not guess emails. Return an empty array if nothing qualifies.',
        },
        {
          role: 'user',
          content: `Trade: ${tradeLabel}\nArea: ${cityLabel}, Georgia\n\nSearch results:\n${context}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI extraction failed: ${res.status} ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content
  if (!content) return []

  const parsed = JSON.parse(content) as { businesses: DiscoveredProspect[] }
  return (parsed.businesses ?? []).filter((b) => b.businessName?.trim() && b.email?.trim())
}

function prospectsFromSnippetsOnly(organic: SerperOrganic[]): DiscoveredProspect[] {
  const out: DiscoveredProspect[] = []
  for (const row of organic) {
    const blob = `${row.title ?? ''} ${row.snippet ?? ''} ${row.link ?? ''}`
    const emails = extractEmailsFromText(blob)
    if (emails.length === 0) continue
    const name = (row.title ?? 'Local pro').split('|')[0]?.split('-')[0]?.trim() || 'Local pro'
    out.push({
      businessName: name.slice(0, 120),
      email: emails[0],
      website: row.link,
      notes: 'Email found in search snippet',
    })
  }
  return out
}

export function resolveDiscoveryTrade(category: string) {
  const value = normalizeCategory(category)
  const known = CATEGORIES.find((c) => c.value === value)
  return { value, term: known?.term ?? category, label: known?.label ?? category }
}

async function discoverViaSerper(cityLabel: string, trade: ReturnType<typeof resolveDiscoveryTrade>) {
  const query = `${trade.term} ${cityLabel} GA contact email`

  const organic = await serperSearch(query)
  if (organic.length === 0) return { prospects: [], query }

  const prospects = process.env.OPENAI_API_KEY?.trim()
    ? await structureProspectsWithOpenAI(cityLabel, trade.label, organic)
    : prospectsFromSnippetsOnly(organic)

  const seen = new Set<string>()
  const deduped: DiscoveredProspect[] = []
  for (const p of prospects) {
    const email = p.email.trim().toLowerCase()
    if (!email.includes('@') || seen.has(email)) continue
    seen.add(email)
    deduped.push({ ...p, email, businessName: p.businessName.trim() })
  }

  return { prospects: deduped, query }
}

export async function discoverProspectsInArea(city: string, category: string) {
  if (!isOpenTown(city)) {
    throw new Error('City must be an opened town (e.g. Marietta, GA)')
  }

  const trade = resolveDiscoveryTrade(category)
  const cityLabel = formatCityLabel(city)

  if (discoveryProvider() === 'cursor') {
    const cursor = await discoverProspectsViaCursor(city, trade.label)
    const fallback = process.env.OUTREACH_DISCOVERY_FALLBACK?.trim().toLowerCase()
    if (
      cursor.prospects.length === 0 &&
      (fallback === 'serper' || (fallback !== 'none' && process.env.SERPER_API_KEY?.trim()))
    ) {
      const serper = await discoverViaSerper(cityLabel, trade)
      return {
        ...serper,
        warning: cursor.warning,
        query: cursor.query,
      }
    }
    return cursor
  }

  return discoverViaSerper(cityLabel, trade)
}
