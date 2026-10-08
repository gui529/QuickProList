import { NextRequest, NextResponse } from 'next/server'
import { getPublicListingStatus } from '@/lib/public-listing-status'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(req)
  if (ip !== 'unknown' && !checkRateLimit(`listing-status:${ip}`, 60)) {
    return rateLimitResponse()
  }

  const { id } = await params
  if (!id?.trim()) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const result = await getPublicListingStatus(id.trim())
  if (result.status === 'unknown' && !result.businessName) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(result)
}
