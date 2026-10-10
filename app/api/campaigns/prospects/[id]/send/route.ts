import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getCampaignProspect, setCampaignProspectStatus } from '@/lib/campaign-prospects'
import { sendCampaignEmail } from '@/lib/campaign-send'
import { SuppressedError } from '@/lib/suppressions'
import { errorMessage as toErrorMessage } from '@/lib/errors'

export const maxDuration = 60

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
  const row = await getCampaignProspect(id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (row.status !== 'approved') {
    return NextResponse.json({ error: 'Approve before sending' }, { status: 400 })
  }

  try {
    const result = await sendCampaignEmail({
      businessName: row.businessName,
      email: row.email,
      category: row.category,
      city: row.city,
    })
    if (result.status === 'failed') {
      const prospect = await setCampaignProspectStatus(id, 'failed', {
        errorMessage: result.errorMessage,
      })
      return NextResponse.json(
        { error: result.errorMessage ?? 'Send failed', prospect },
        { status: 502 }
      )
    }
    const prospect = await setCampaignProspectStatus(id, 'sent')
    return NextResponse.json({ prospect, contact: result.contact })
  } catch (err) {
    if (err instanceof SuppressedError) {
      return NextResponse.json({ error: 'Recipient has opted out' }, { status: 403 })
    }
    const msg = toErrorMessage(err, String(err))
    await setCampaignProspectStatus(id, 'failed', { errorMessage: msg })
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
