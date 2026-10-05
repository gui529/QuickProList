// Verified against node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
// and node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md ("`middleware` to `proxy`"):
// Next 16.0.0 deprecates the `middleware.ts` file convention and the `middleware` export name in
// favor of `proxy.ts` / `export function proxy`. Renamed per that guide's documented codemod steps.
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Refreshed tokens must be visible to Server Components rendering this same
          // request (via the request cookies) and persisted in the browser (via the response).
          for (const { name, value } of cookiesToSet) {
            req.cookies.set(name, value)
          }
          res = NextResponse.next({ request: req })
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set({ name, value, ...options })
          }
        },
      },
    }
  )

  // Do not run code between createServerClient and getUser(): getUser() revalidates
  // the token with Supabase and triggers the refresh that setAll persists.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = req.nextUrl
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/')

  if (!user && isAdminPath) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    const redirect = NextResponse.redirect(url)
    for (const cookie of res.cookies.getAll()) {
      redirect.cookies.set(cookie)
    }
    return redirect
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
