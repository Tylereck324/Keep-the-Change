'use client'

import dynamic from 'next/dynamic'
import { LazyMount } from '@/components/lazy-mount'
import { ChartSkeleton } from '@/components/chart-skeleton'

type ReportChartsProps = {
  transactionsByDay: Array<{ date: string; amount: number }>
  categories: Array<{
    categoryId: string
    categoryName: string
    categoryColor: string
    budgeted: number
    spent: number
    remaining: number
    percentUsed: number
    transactionCount: number
  }>
  trendData: Array<{ month: string; spent: number; budgeted: number }>
}

const SpendingTimelineChart = dynamic(
  () => import('@/components/reports/spending-timeline-chart').then((m) => m.SpendingTimelineChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> }
)
const CategoryBreakdownChart = dynamic(
  () => import('@/components/reports/category-breakdown-chart').then((m) => m.CategoryBreakdownChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> }
)
const TrendChart = dynamic(
  () => import('@/components/reports/trend-chart').then((m) => m.TrendChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> }
)

export function ReportCharts({ transactionsByDay, categories, trendData }: ReportChartsProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <LazyMount fallback={<ChartSkeleton height={300} />}>
          <SpendingTimelineChart data={transactionsByDay} />
        </LazyMount>
        <LazyMount fallback={<ChartSkeleton height={300} />}>
          <CategoryBreakdownChart data={categories} />
        </LazyMount>
      </div>

      <div className="mb-6">
        <LazyMount fallback={<ChartSkeleton height={300} />}>
          <TrendChart data={trendData} />
        </LazyMount>
      </div>
    </>
  )
}
