'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TrendChartProps {
  data: Array<{
    month: string
    spent: number
    budgeted: number
  }>
}

export function TrendChart({ data }: TrendChartProps) {
  const formattedData = data.map((item) => ({
    month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    spent: item.spent,
    budgeted: item.budgeted,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              stroke="hsl(var(--border))"
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              stroke="hsl(var(--border))"
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value: number | undefined) => value !== undefined ? `$${value.toFixed(2)}` : '$0.00'}
            />
            <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
            <Line
              type="monotone"
              dataKey="budgeted"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Budgeted"
            />
            <Line
              type="monotone"
              dataKey="spent"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Spent"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
