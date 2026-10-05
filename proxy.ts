// Protects /admin/* only. Must not touch Supabase: public pages have to keep
// rendering when auth or database env vars are missing.
import { NextResponse, type NextRequest } from 'next/server'
import { auth, isAuthConfigured } from '@/lib/auth-config'

function toLogin(req: NextRequest) {
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  return NextResponse.redirect(url)
}

const withSession = auth((req) => (req.auth ? NextResponse.next() : toLogin(req)))

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/')
  if (!isAdminPath) return NextResponse.next()
  if (!isAuthConfigured()) return toLogin(req)

  try {
    return (await withSession(req, { params: Promise.resolve({}) })) ?? toLogin(req)
  } catch (err) {
    console.error('proxy: auth check failed', err)
    return toLogin(req)
  }
}

export const config = {
  matcher: ['/admin/:path*'],
}
