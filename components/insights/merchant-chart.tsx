'use client'

import { memo, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MerchantInsight } from '@/lib/actions/insights'

interface MerchantChartProps {
  data: MerchantInsight[]
}

export const MerchantChart = memo(function MerchantChart({ data }: MerchantChartProps) {
  // Memoize chart data transformation
  const chartData = useMemo(() => data.map(m => ({
    name: m.displayName.length > 15 ? m.displayName.slice(0, 15) + '...' : m.displayName,
    fullName: m.displayName,
    amount: m.totalSpent,
    count: m.transactionCount,
  })), [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Top 10 Merchants</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              tickFormatter={(value) => `$${value}`}
              stroke="hsl(var(--border))"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              stroke="hsl(var(--border))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value: number | undefined) => value !== undefined ? [`$${value.toFixed(2)}`, 'Total Spent'] : ['$0.00', 'Total Spent']}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullName
                }
                return label
              }}
            />
            <Bar
              dataKey="amount"
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})
