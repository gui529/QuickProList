import { headers } from 'next/headers'
import { loginErrorMessage } from '@/lib/login-errors'
import { qaLoginAllowed } from '@/lib/qa-login'
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { error } = await searchParams
  const code = Array.isArray(error) ? error[0] : error
  const host = (await headers()).get('host')
  return <LoginForm initialError={loginErrorMessage(code)} qaLogin={qaLoginAllowed(host)} />
}
