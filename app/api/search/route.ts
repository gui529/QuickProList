import { NextRequest, NextResponse } from 'next/server'
import { searchBusinesses, type SearchLocation } from '@/lib/yelp'
import { CATEGORIES } from '@/lib/categories'
import { getMergedResults } from '@/lib/search'
import { NOT_OPEN_MESSAGE, formatTown, resolveOpenTown } from '@/lib/open-towns'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { toPublicBusiness } from '@/lib/public-business'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  if (!checkRateLimit(`search:${ip}`, 10)) return rateLimitResponse()
  const sp = req.nextUrl.searchParams
  const location = sp.get('location')?.trim()
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const category = sp.get('category')?.trim()
  const term = sp.get('term')?.trim()
  const raw = sp.get('raw') === '1'
  const highlight = sp.get('highlight')?.trim() || undefined

  if (!category && !(raw && term)) {
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
  const where: SearchLocation = { location: formatTown(town) }

  try {
    if (raw) {
      const effectiveTerm =
        term || CATEGORIES.find((c) => c.value === category)?.term || category || ''
      const effectiveCategory = term ? undefined : category
      const businesses = await searchBusinesses(where, effectiveCategory, effectiveTerm, 20)
      return NextResponse.json({ businesses: businesses.map(toPublicBusiness) })
    }
    const businesses = await getMergedResults(where, category!, { highlightId: highlight })
    return NextResponse.json({ businesses: businesses.map(toPublicBusiness) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 502 })
  }
}
