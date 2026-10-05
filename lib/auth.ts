import { createClient } from '@supabase/supabase-js'
import { auth, isAuthConfigured } from './auth-config'

function serviceClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function isAdminEmail(email: string | undefined | null): Promise<boolean> {
  if (!email) return false
  const sb = serviceClient()
  if (!sb) return false
  const { data, error } = await sb.from('admins').select('email').eq('email', email).maybeSingle()
  if (error) console.error('admins lookup failed', error.message)
  return !!data
}

export interface AdminSession {
  email: string
  /** Google account subject (stable id), falling back to the email. */
  userId: string
}

async function signedInUser(): Promise<{ email: string; userId: string } | null> {
  if (!isAuthConfigured()) return null
  const session = await auth()
  const email = session?.user?.email
  if (!email) return null
  return { email, userId: session.user?.id || email }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const user = await signedInUser()
  if (!user) return null
  if (!(await isAdminEmail(user.email))) return null
  return user
}

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message)
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const user = await signedInUser()
  if (!user) throw new AuthError(401, 'Not signed in')
  if (!(await isAdminEmail(user.email))) throw new AuthError(403, 'Not an admin')
  return user
}
