import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { setCampaignContactProResponse } from '@/lib/campaigns'

export async function POST(
  req: NextRequest,
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
  let body: { response?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = body.response?.trim().toLowerCase()
  if (raw !== 'yes' && raw !== 'no' && raw !== 'clear') {
    return NextResponse.json({ error: 'response must be yes, no, or clear' }, { status: 400 })
  }

  const contact = await setCampaignContactProResponse(id, raw === 'clear' ? null : raw)
  if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ contact })
}
