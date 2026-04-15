import { loadData, getFlatDeadlines, getDaysUntil } from '@/lib/data'
import { FlatDeadline } from '@/lib/types'
import DashboardClient from '@/components/DashboardClient'

export const dynamic = 'force-dynamic'

export default function Home() {
  const data = loadData()
  const flatDeadlines = getFlatDeadlines(data)

  return (
    <DashboardClient
      flatDeadlines={flatDeadlines}
      guichets={data.guichets}
      lastUpdated={data.meta.lastUpdated}
      updatedBy={data.meta.updatedBy}
    />
  )
}
