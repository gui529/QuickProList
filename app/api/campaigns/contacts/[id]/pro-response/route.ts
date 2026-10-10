import { NextRequest, NextResponse } from 'next/server'
import { AuthError, requireAdmin } from '@/lib/auth'
import { setCampaignContactProResponse } from '@/lib/campaigns'
import { errorMessage as toErrorMessage } from '@/lib/errors'

function schemaHint(message: string): string | null {
  if (/pro_response|logo_url|column|does not exist/i.test(message)) {
    return 'Campaign database schema is out of date — wait for deploy or run pending migrations (020+).'
  }
  return null
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

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
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const msg = toErrorMessage(err, String(err))
    console.error('campaign pro-response failed:', err)
    return NextResponse.json(
      { error: schemaHint(msg) ?? msg ?? 'Failed to update pro response' },
      { status: 500 }
    )
  }
}
