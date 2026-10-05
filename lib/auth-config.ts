import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, auth } = NextAuth({
  providers: [Google({ authorization: { params: { prompt: 'select_account' } } })],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    signIn({ profile }) {
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
