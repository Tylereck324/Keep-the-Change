'use client'

import dynamic from 'next/dynamic'
import { LazyMount } from '@/components/lazy-mount'
import { ChartSkeleton } from '@/components/chart-skeleton'
import type { MerchantInsight } from '@/lib/actions/insights'

const MerchantChart = dynamic(
  () => import('@/components/insights/merchant-chart').then((m) => m.MerchantChart),
  { ssr: false, loading: () => <ChartSkeleton height={350} /> }
)

export function MerchantChartSection({ data }: { data: MerchantInsight[] }) {
  return (
    <LazyMount fallback={<ChartSkeleton height={350} />}>
      <MerchantChart data={data} />
    </LazyMount>
  )
}
