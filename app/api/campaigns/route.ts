import { NextRequest, NextResponse } from 'next/server'
import { AuthError, requireAdmin } from '@/lib/auth'
import { listCampaignContacts } from '@/lib/campaigns'

async function gate(): Promise<NextResponse | null> {
  try {
    await requireAdmin()
    return null
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}

export async function GET(_req: NextRequest) {
  const denied = await gate()
  if (denied) return denied
  try {
    const contacts = await listCampaignContacts()
    return NextResponse.json({ contacts })
  } catch (err) {
    console.error('campaigns GET failed:', err)
    const msg = err instanceof Error ? err.message : String(err)
    const hint = /pro_response|logo_url|column|does not exist/i.test(msg)
      ? 'Campaign database schema is out of date — wait for deploy or run pending migrations (020+).'
      : 'Failed to load campaign contacts'
    return NextResponse.json({ error: hint }, { status: 500 })
  }
}
