import { NextRequest, NextResponse } from 'next/server'
import { createListingRequest, listListingRequests } from '@/lib/listing-requests'
import { AuthError, requireAdmin } from '@/lib/auth'

interface Submission {
  businessName: string
  contactName: string
  email: string
  phone?: string
  category: string
  zip: string
  message?: string
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export async function POST(req: NextRequest) {
  let body: Partial<Submission>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const businessName = body.businessName?.trim()
  const contactName = body.contactName?.trim()
  const email = body.email?.trim()
  const phone = body.phone?.trim()
  const category = body.category?.trim()
  const zip = body.zip?.trim()
  const message = body.message?.trim()

  if (!businessName || !contactName || !email || !category || !zip) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  try {
    await createListingRequest({ businessName, contactName, email, phone, category, zip, message })
  } catch (err) {
    // Persisting the lead is important, but a Supabase hiccup shouldn't
    // block the submitter from seeing a success response — log and move on.
    console.error('[list-business] failed to persist submission', err)
  }

  return NextResponse.json({ ok: true })
}

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }

  try {
    const requests = await listListingRequests()
    return NextResponse.json({ requests })
  } catch (err) {
    console.error('listListingRequests failed:', err)
    return NextResponse.json({ error: 'Failed to load listing requests' }, { status: 500 })
  }
}
