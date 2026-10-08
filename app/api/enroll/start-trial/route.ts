import { NextRequest, NextResponse } from 'next/server'
import { activateEnrollmentTrial, EnrollmentTrialError } from '@/lib/enrollment-trial'
import { isProDashboardEnabled } from '@/lib/feature-flags'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!checkRateLimit(`enroll-trial:${ip}`, 10)) return rateLimitResponse()

  let body: { token?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const token = body.token?.trim()
  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }

  try {
    const result = await activateEnrollmentTrial(token, body.email?.trim() || null)
    return NextResponse.json({
      ok: true,
      trialEndsAt: result.trialEndsAt,
      curatedBusinessId: result.curatedBusinessId,
      dashboardToken: isProDashboardEnabled() ? result.dashboardToken : null,
    })
  } catch (err) {
    if (err instanceof EnrollmentTrialError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    }
    console.error('start-trial failed:', err)
    return NextResponse.json({ error: 'Failed to start preview' }, { status: 500 })
  }
}
