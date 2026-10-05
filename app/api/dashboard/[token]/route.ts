import { NextRequest, NextResponse } from 'next/server'
import { updateCuratedByDashboardToken, type DashboardEditableFields } from '@/lib/kv'
import { errorMessage } from '@/lib/errors'

/**
 * Self-serve edit endpoint for a subscribed business, gated by nothing but
 * possession of its `dashboard_token` (the same token that unlocks
 * `/dashboard/[token]`) — no separate login exists for businesses. Only the
 * allow-listed fields below can be changed; name/category/cities/pricing
 * stay admin-controlled via `/api/curated`.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const fields: DashboardEditableFields = {}
  if (typeof body.websiteUrl === 'string') fields.websiteUrl = body.websiteUrl
  if (typeof body.contactEmail === 'string') fields.contactEmail = body.contactEmail
  if (typeof body.reviewUrl === 'string') fields.reviewUrl = body.reviewUrl

  if (Object.keys(fields).length === 0) {
    return NextResponse.json(
      { error: 'At least one of websiteUrl, contactEmail, reviewUrl is required' },
      { status: 400 }
    )
  }

  try {
    const updated = await updateCuratedByDashboardToken(token, fields)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('request failed:', err)
    const msg = errorMessage(err, 'Failed to update')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
