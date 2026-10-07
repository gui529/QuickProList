import { auth, isAuthConfigured } from './auth-config'
import { isDatabaseConfigured, query } from './db'

async function isAdminEmail(email: string | undefined | null): Promise<boolean> {
  const wanted = email?.trim().toLowerCase()
  if (!wanted) return false
  if (!isDatabaseConfigured()) return false
  const rows = await query<{ email: string }>('SELECT email FROM admins')
  return rows.some((row) => row.email?.trim().toLowerCase() === wanted)
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
