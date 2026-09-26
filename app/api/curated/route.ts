import { NextRequest, NextResponse } from 'next/server'
import {
  addCuratedFromYelp,
  addCuratedManual,
  listAllCurated,
  removeCurated,
  getCurated,
  updateCuratedCities,
  updateProSiteEnabled,
  updateCuratedManual,
} from '@/lib/kv'
import { getBusinessById } from '@/lib/yelp'
import { AuthError, requireAdmin } from '@/lib/auth'

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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const category = sp.get('category')
  const city = sp.get('city')
  if (category && city) {
    const businesses = await getCurated(category, city)
    return NextResponse.json({ businesses })
  }
  const businesses = await listAllCurated()
  return NextResponse.json({ businesses })
}

export async function POST(req: NextRequest) {
  const denied = await gate()
  if (denied) return denied
  const body = await req.json()

  if (body.source === 'yelp') {
    if (!body.business || !body.category || !body.city) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    try {
      // Fetch detail endpoint to get website URL (not available in search results)
      let business = body.business
      const detail = await getBusinessById(business.id).catch(() => null)
      if (detail?.websiteUrl) business = { ...business, websiteUrl: detail.websiteUrl }
      await addCuratedFromYelp(business, body.category, [body.city])
      return NextResponse.json({ ok: true })
    } catch (err) {
      console.error('addCuratedFromYelp failed:', err)
      const msg = err instanceof Error ? err.message : 'Failed to save'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  if (body.source === 'manual') {
    const cities: string[] = Array.isArray(body.cities) ? body.cities : body.city ? [body.city] : []
    if (!body.name || !body.category || cities.length === 0) {
      return NextResponse.json({ error: 'name, category, and at least one city are required' }, { status: 400 })
    }
    try {
      await addCuratedManual({
        name: body.name,
        phone: body.phone,
        address: body.address,
        websiteUrl: body.websiteUrl,
        imageUrl: body.imageUrl,
        category: body.category,
        cities,
        categories: body.categories,
      })
      return NextResponse.json({ ok: true })
    } catch (err) {
      console.error('addCuratedManual failed:', err)
      const msg = err instanceof Error ? err.message : 'Failed to save'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const denied = await gate()
  if (denied) return denied
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  try {
    if (typeof body.proSiteEnabled === 'boolean') {
      await updateProSiteEnabled(body.id, body.proSiteEnabled)
    } else if (Array.isArray(body.cities)) {
      await updateCuratedCities(body.id, body.cities)
    } else if (body.source === 'manual') {
      await updateCuratedManual(body.id, {
        name: body.name,
        phone: body.phone,
        address: body.address,
        websiteUrl: body.websiteUrl,
        imageUrl: body.imageUrl,
        category: body.category,
        cities: body.cities_update,
        categories: body.categories,
      })
    } else {
      return NextResponse.json({ error: 'proSiteEnabled, cities, or manual fields are required' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await gate()
  if (denied) return denied
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    await removeCurated(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to remove'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
