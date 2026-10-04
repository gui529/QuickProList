import { NextRequest, NextResponse } from 'next/server'
import { getMergedResults } from '@/lib/search'
import { NOT_OPEN_MESSAGE, formatTown, resolveOpenTown } from '@/lib/open-towns'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  if (!checkRateLimit(`search:${ip}`, 10)) return rateLimitResponse()
  const sp = req.nextUrl.searchParams
  const location = sp.get('location')?.trim()
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const category = sp.get('category')?.trim()
  const raw = sp.get('raw') === '1'
  const highlight = sp.get('highlight')?.trim() || undefined

  // The old raw flag fetched live Yelp results for admin curation. That
  // integration is gone; reject it instead of searching.
  if (raw) {
    return NextResponse.json({ error: 'That search is not available' }, { status: 400 })
  }

  if (!category) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 })
  }

  if (!location && !(lat && lng)) {
    return NextResponse.json({ error: 'location is required' }, { status: 400 })
  }

  // Coordinates cannot be tied to an opened town, so only town names are accepted.
  const town = location ? resolveOpenTown(location) : null
  if (!town) {
    return NextResponse.json({ error: NOT_OPEN_MESSAGE, code: 'outside_open_area' }, { status: 400 })
  }

  try {
    const businesses = await getMergedResults(
      { location: formatTown(town) },
      category,
      { highlightId: highlight }
    )
    return NextResponse.json({ businesses })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ businesses: [] })
  }
}
