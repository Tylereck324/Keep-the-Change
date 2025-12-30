'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MerchantInsight } from '@/lib/actions/insights'

interface MerchantChartProps {
  data: MerchantInsight[]
}

export function MerchantChart({ data }: MerchantChartProps) {
  const chartData = data.map(m => ({
    name: m.displayName.length > 15 ? m.displayName.slice(0, 15) + '...' : m.displayName,
    fullName: m.displayName,
    amount: m.totalSpent,
    count: m.transactionCount,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Merchants</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis
              type="number"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `$${value}`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
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
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
