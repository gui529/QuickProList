import { getAdminSession } from '@/lib/auth'
import Navbar from './Navbar'

export default async function SiteNav() {
  const isAdmin = await getAdminSession().then(
    (session) => session !== null,
    (err) => {
      console.error('SiteNav: admin session check failed', err)
      return false
    }
  )
  return <Navbar isAdmin={isAdmin} />
}
