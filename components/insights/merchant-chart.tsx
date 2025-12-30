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
        <CardTitle className="text-gray-900 dark:text-gray-100">Top 10 Merchants</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
            <XAxis
              type="number"
              className="text-xs"
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(value) => `$${value}`}
              stroke="#374151"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              className="text-xs"
              tick={{ fill: '#9ca3af' }}
              stroke="#374151"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
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
}
