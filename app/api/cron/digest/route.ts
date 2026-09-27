import { NextRequest, NextResponse } from 'next/server'
import { sendPerformanceDigests } from '@/lib/digest'

/**
 * Cron-triggered endpoint (see `vercel.json`'s `crons` entry) that sends the
 * recurring performance-digest email to every subscribed business. Gated on
 * a `CRON_SECRET` env var passed as `Authorization: Bearer <secret>` — the
 * same header Vercel Cron Jobs attach automatically when `CRON_SECRET` is
 * configured — so it's safe to expose without session-based admin auth.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await sendPerformanceDigests()
  return NextResponse.json({ sent: results.length })
}
