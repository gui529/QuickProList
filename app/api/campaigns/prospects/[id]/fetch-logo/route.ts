import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getCampaignProspect, refreshCampaignProspectLogo } from '@/lib/campaign-prospects'

export const maxDuration = 30

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch (err) {
    const status = err && typeof err === 'object' && 'status' in err ? Number((err as { status: number }).status) : 401
    const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Unauthorized'
    return NextResponse.json({ error: message }, { status })
  }

  try {
    const { id } = await context.params
    const existing = await getCampaignProspect(id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!existing.website?.trim()) {
      return NextResponse.json({ error: 'No website on this prospect' }, { status: 400 })
    }

    const prospect = await refreshCampaignProspectLogo(id)
    if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const logoFound = Boolean(prospect.logoUrl)
    return NextResponse.json({
      prospect,
      logoFound,
      error: logoFound ? undefined : 'No logo found on website',
    })
  } catch (err) {
    console.error('fetch-logo failed:', err)
    const message =
      err instanceof Error && /logo_url|column/i.test(err.message)
        ? 'Database missing logo_url — run migration 022 on this branch.'
        : 'Failed to fetch logo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
