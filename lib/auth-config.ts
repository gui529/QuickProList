import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { headers } from 'next/headers'
import { QA_ADMIN_EMAIL, qaLoginAllowed } from './qa-login'

async function requestHost(): Promise<string> {
  try {
    return (await headers()).get('host') ?? ''
  } catch {
    return ''
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
        const secret = process.env.QA_ADMIN_SECRET
        const given = typeof credentials?.secret === 'string' ? credentials.secret : ''
        if (!secret || !given || given !== secret) return null
        if (!qaLoginAllowed(await requestHost())) return null
        return { id: 'qa-admin', email: QA_ADMIN_EMAIL, name: 'QA' }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async signIn({ profile, account }) {
      if (account?.provider === 'qa') return qaLoginAllowed(await requestHost())
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
