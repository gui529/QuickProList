import { createClient } from '@supabase/supabase-js'
import { getServerSupabase } from './supabase/server'

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
  userId: string
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return null
  if (!(await isAdminEmail(user.email))) return null
  return { email: user.email, userId: user.id }
}

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message)
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) throw new AuthError(401, 'Not signed in')
  if (!(await isAdminEmail(user.email))) throw new AuthError(403, 'Not an admin')
  return { email: user.email, userId: user.id }
}
