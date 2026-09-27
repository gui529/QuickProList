import { NextRequest, NextResponse } from 'next/server'
import { sendWinbackEmails } from '@/lib/winback'

/**
 * Cron-triggered endpoint (see `vercel.json`'s `crons` entry) that sends a
 * one-time win-back email to every business whose free trial expired
 * without converting to a paid subscription. Gated on a `CRON_SECRET` env
 * var passed as `Authorization: Bearer <secret>` — the same header Vercel
 * Cron Jobs attach automatically when `CRON_SECRET` is configured — so it's
 * safe to expose without session-based admin auth. Mirrors
 * `app/api/cron/digest/route.ts`'s auth pattern.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await sendWinbackEmails()
  return NextResponse.json({ sent: results.length })
}
