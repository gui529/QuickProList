import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { safeRedirectPath } from '@/lib/safe-redirect'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const next = safeRedirectPath(req.nextUrl.searchParams.get('next'), '/admin')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', req.url))
  }

  // Build the redirect response first so we can attach session cookies directly to it.
  // Using cookies() from next/headers here would write to a different response object
  // and the Set-Cookie headers would not reach the browser on a redirect.
  const redirectResponse = NextResponse.redirect(new URL(next, req.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            redirectResponse.cookies.set({ name, value, ...options })
          }
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url))
  }

  return redirectResponse
}
