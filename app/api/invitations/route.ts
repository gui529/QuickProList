import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthError } from '@/lib/auth'
import { createInvitation, createTrialInvitation, listInvitations, deleteInvitation } from '@/lib/invitations'
import {
  normalizeCity,
  addCuratedFromYelp,
  addCuratedManual,
  findCuratedIdByYelpId,
  findLatestManualCuratedId,
  setCuratedTrial,
} from '@/lib/kv'
import type { Business } from '@/lib/business'
import { errorMessage } from '@/lib/errors'

async function gate(req?: NextRequest): Promise<NextResponse | null> {
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

export async function POST(req: NextRequest) {
  const denied = await gate()
  if (denied) return denied

  const body = await req.json()
  if (!body.businessName || !body.category || !Array.isArray(body.cities)) {
    return NextResponse.json(
      { error: 'businessName, category, and cities are required' },
      { status: 400 }
    )
  }

  const cities = body.cities.map(normalizeCity).filter(Boolean) as string[]
  if (cities.length === 0) {
    return NextResponse.json({ error: 'At least one valid city is required' }, { status: 400 })
  }

  // --- Trial path ---
  if (body.isTrial) {
    try {
      const trialDays: number | null = body.trialDays ?? null
      const trialEndsAt = trialDays
        ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
        : null

      let curatedBusinessId: string

      if (body.existingCuratedId) {
        await setCuratedTrial(body.existingCuratedId, trialEndsAt, cities)
        curatedBusinessId = body.existingCuratedId
      } else if (body.yelpId && body.yelpData) {
        const business = body.yelpData as Partial<Business>
        await addCuratedFromYelp(
          {
            id: body.yelpId,
            name: body.businessName,
            rating: business.rating ?? null,
            reviewCount: business.reviewCount ?? null,
            phone: business.phone || '',
            address: business.address || '',
            imageUrl: business.imageUrl || '',
            url: business.url || '',
            websiteUrl: business.websiteUrl,
            categories: business.categories || [],
            source: 'yelp',
            yelpId: body.yelpId,
          },
          body.category,
          cities,
          trialEndsAt
        )
        curatedBusinessId = (await findCuratedIdByYelpId(body.yelpId)) || ''
      } else {
        await addCuratedManual({
          name: body.businessName,
          category: body.category,
          cities,
          trialEndsAt,
        })
        curatedBusinessId = (await findLatestManualCuratedId(body.businessName)) || ''
      }

      await createTrialInvitation({
        businessName: body.businessName,
        category: body.category,
        cities,
        trialEndsAt,
        curatedBusinessId,
        yelpId: body.yelpId,
        yelpData: body.yelpData,
      })

      return NextResponse.json({ ok: true })
    } catch (err) {
      console.error('createTrial failed:', err)
      const msg = errorMessage(err, 'Failed to start trial')
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // --- Regular enrollment path ---
  try {
    const token = await createInvitation({
      businessName: body.businessName,
      category: body.category,
      cities,
      monthlyPrice: body.monthlyPrice || 29.99,
      yelpId: body.yelpId,
      yelpData: body.yelpData,
      curatedBusinessId: body.existingCuratedId || undefined,
    })
    return NextResponse.json({ token })
  } catch (err) {
    console.error('createInvitation failed:', err)
    const msg = errorMessage(err, 'Failed to create invitation')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }

  try {
    const invitations = await listInvitations()
    return NextResponse.json({ invitations })
  } catch (err) {
    console.error('listInvitations failed:', err)
    return NextResponse.json({ error: 'Failed to list invitations' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await gate()
  if (denied) return denied
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    await deleteInvitation(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('request failed:', err)
    const msg = errorMessage(err, 'Failed to remove')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
