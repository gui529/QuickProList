import type { NextRequest } from 'next/server'
import { AuthError, requireAdmin } from './auth'
import { isValidOutreachBearer } from './outreach-bearer'

/** Admin session or local outreach CLI bearer token. */
export async function requireAdminOrOutreach(req: NextRequest): Promise<void> {
  if (isValidOutreachBearer(req)) return
  await requireAdmin()
}

/** Discovery worker only — bearer token, not admin session. */
export async function gateOutreachBearer(
  req: NextRequest
): Promise<{ error: string; status: number } | null> {
  if (isValidOutreachBearer(req)) return null
  return { error: 'Unauthorized', status: 401 }
}

export async function gateAdminOrOutreach(
  req: NextRequest
): Promise<{ error: string; status: number } | null> {
  try {
    await requireAdminOrOutreach(req)
    return null
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: err.message, status: err.status }
    }
    throw err
  }
}
