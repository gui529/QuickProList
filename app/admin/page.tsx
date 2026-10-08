import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { isProDashboardEnabled } from '@/lib/feature-flags'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const session = await getAdminSession()
  if (!session) {
    redirect('/login?error=not_an_admin')
  }
  return <AdminClient adminEmail={session.email} proDashboardEnabled={isProDashboardEnabled()} />
}
