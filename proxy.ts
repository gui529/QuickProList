// Verified against node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
// and node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md ("`middleware` to `proxy`"):
// Next 16.0.0 deprecates the `middleware.ts` file convention and the `middleware` export name in
// favor of `proxy.ts` / `export function proxy`. Renamed per that guide's documented codemod steps.
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()

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
            res.cookies.set({ name, value, ...options })
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}
