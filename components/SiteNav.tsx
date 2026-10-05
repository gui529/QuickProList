import { getAdminSession } from '@/lib/auth'
import Navbar from './Navbar'

export default async function SiteNav() {
  const isAdmin = await getAdminSession().then(
    (session) => session !== null,
    () => false
  )
  return <Navbar isAdmin={isAdmin} />
}
