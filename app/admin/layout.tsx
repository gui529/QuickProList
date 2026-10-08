import { Suspense } from 'react'
import AdminSidebar from '@/components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <Suspense fallback={null}>
        <AdminSidebar />
      </Suspense>
      <div className="min-w-0 flex-1 w-full">{children}</div>
    </div>
  )
}
