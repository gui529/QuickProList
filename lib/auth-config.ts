import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { headers } from 'next/headers'
import { checkRateLimit } from './rate-limit'
import { QA_ADMIN_EMAIL, QA_LOGIN_MAX_ATTEMPTS, constantTimeEqual, qaLoginAllowed } from './qa-login'

async function requestHeaders(): Promise<Headers | null> {
  try {
    return await headers()
  } catch {
    return null
  }
}

export const { handlers, auth } = NextAuth({
  providers: [
    Google({ authorization: { params: { prompt: 'select_account' } } }),
    Credentials({
      id: 'qa',
      name: 'QA',
      credentials: { secret: { label: 'QA secret', type: 'password' } },
      authorize: async (credentials) => {
        const hdrs = await requestHeaders()
        const host = hdrs?.get('host') ?? ''
        const ip = hdrs?.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
        if (!checkRateLimit(`qa-login:${ip}`, QA_LOGIN_MAX_ATTEMPTS)) return null
        if (!qaLoginAllowed(host)) return null
        const secret = process.env.QA_ADMIN_SECRET ?? ''
        const given = typeof credentials?.secret === 'string' ? credentials.secret : ''
        if (!constantTimeEqual(given, secret)) return null
        return { id: 'qa-admin', email: QA_ADMIN_EMAIL, name: 'QA' }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async signIn({ profile, account }) {
      if (account?.provider === 'qa') return qaLoginAllowed((await requestHeaders())?.get('host') ?? '')
      return profile?.email_verified === true
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub
      return session
    },
  },
})

export function isAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
}
