import { loginErrorMessage } from '@/lib/login-errors'
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { error } = await searchParams
  const code = Array.isArray(error) ? error[0] : error
  return <LoginForm initialError={loginErrorMessage(code)} />
}
