import { NextRequest, NextResponse } from 'next/server'
import { sendTrialReminders } from '@/lib/trial-reminder'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await sendTrialReminders()
  return NextResponse.json({ sent: results.length })
}
