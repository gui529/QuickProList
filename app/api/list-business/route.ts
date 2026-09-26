import { NextRequest, NextResponse } from 'next/server'
import { createListingRequest } from '@/lib/listing-requests'

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
