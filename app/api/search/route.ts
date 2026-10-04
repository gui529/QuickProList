import { NextRequest, NextResponse } from 'next/server'
import { searchBusinesses, type SearchLocation } from '@/lib/yelp'
import { CATEGORIES } from '@/lib/categories'
import { getMergedResults } from '@/lib/search'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

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

  let where: SearchLocation
  if (lat && lng) {
    const latitude = Number(lat)
    const longitude = Number(lng)
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json({ error: 'invalid coordinates' }, { status: 400 })
    }
    where = { latitude, longitude }
  } else if (location) {
    where = { location }
  } else {
    return NextResponse.json({ error: 'location or lat/lng is required' }, { status: 400 })
  }

  try {
    if (raw) {
      const effectiveTerm =
        term || CATEGORIES.find((c) => c.value === category)?.term || category || ''
      const effectiveCategory = term ? undefined : category
      const businesses = await searchBusinesses(where, effectiveCategory, effectiveTerm, 20)
      return NextResponse.json({ businesses })
    }
    const businesses = await getMergedResults(where, category!, { highlightId: highlight })
    return NextResponse.json({ businesses })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 502 })
  }
}
