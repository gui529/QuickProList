import { NextRequest, NextResponse } from 'next/server'
import { getCuratedById, incrementContactClick, type ContactClickType } from '@/lib/kv'

const VALID_TYPES: ContactClickType[] = ['phone', 'website', 'directions']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { type?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = body.type
  if (!type || !VALID_TYPES.includes(type as ContactClickType)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const business = await getCuratedById(id)
  if (!business) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    await incrementContactClick(id, type as ContactClickType)
  } catch (err) {
    console.error('incrementContactClick failed:', err)
  }

  return NextResponse.json({ ok: true })
}
