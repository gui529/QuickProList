import { NextResponse } from 'next/server'
import { AuthError, requireAdmin } from '@/lib/auth'
import { getBusinessReports } from '@/lib/reports'

export type { BusinessReport } from '@/lib/reports'

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

export async function GET() {
  const denied = await gate()
  if (denied) return denied
  try {
    const reports = await getBusinessReports()
    return NextResponse.json({ reports })
  } catch (err) {
    console.error('reports failed:', err)
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
}
