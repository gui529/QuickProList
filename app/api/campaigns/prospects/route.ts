import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { addCampaignProspectFromDiscovery, listCampaignProspects } from '@/lib/campaign-prospects'
import type { CampaignProspectStatus } from '@/lib/campaign-prospects'
import { gateOutreachBearer } from '@/lib/outreach-auth'

const STATUSES = new Set<CampaignProspectStatus>([
  'pending_review',
  'approved',
  'rejected',
  'sent',
  'failed',
])

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch (err) {
    const status = err && typeof err === 'object' && 'status' in err ? Number((err as { status: number }).status) : 401
    const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Unauthorized'
    return NextResponse.json({ error: message }, { status })
  }

  const statusParam = req.nextUrl.searchParams.get('status')
  const status =
    statusParam && STATUSES.has(statusParam as CampaignProspectStatus)
      ? (statusParam as CampaignProspectStatus)
      : undefined

  const prospects = await listCampaignProspects(status)
  return NextResponse.json({ prospects })
}

export async function POST(req: NextRequest) {
  const denied = await gateOutreachBearer(req)
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

  let body: {
    businessName?: string
    email?: string
    phone?: string
    website?: string
    category?: string
    city?: string
    discoveryNotes?: string
    searchQuery?: string
    prospects?: {
      businessName?: string
      email?: string
      phone?: string
      website?: string
      category?: string
      city?: string
      discoveryNotes?: string
      searchQuery?: string
    }[]
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const items = body.prospects?.length
    ? body.prospects
    : [
        {
          businessName: body.businessName,
          email: body.email,
          phone: body.phone,
          website: body.website,
          category: body.category,
          city: body.city,
          discoveryNotes: body.discoveryNotes,
          searchQuery: body.searchQuery,
        },
      ]

  const added: unknown[] = []
  let skipped = 0

  for (const item of items) {
    if (!item.businessName?.trim() || !item.email?.trim() || !item.category?.trim() || !item.city?.trim()) {
      skipped += 1
      continue
    }
    const { prospect, skipped: dup } = await addCampaignProspectFromDiscovery({
      businessName: item.businessName,
      email: item.email,
      phone: item.phone,
      website: item.website,
      category: item.category,
      city: item.city,
      discoveryNotes: item.discoveryNotes,
      searchQuery: item.searchQuery,
    })
    if (dup || !prospect) skipped += 1
    else added.push(prospect)
  }

  return NextResponse.json({ added, skipped, prospects: added })
}
