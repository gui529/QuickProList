import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getCampaignProspect, setCampaignProspectStatus } from '@/lib/campaign-prospects'

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

  const { id } = await context.params
  const existing = await getCampaignProspect(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const prospect = await setCampaignProspectStatus(id, 'rejected')
  return NextResponse.json({ prospect })
}
