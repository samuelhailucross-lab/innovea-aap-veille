import { isAuthenticated } from '@/lib/auth'
import { loadData } from '@/lib/data'
import AdminClient from '@/components/AdminClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  if (!isAuthenticated()) {
    redirect('/admin/login')
  }

  const data = loadData()

  return <AdminClient data={data} />
}
