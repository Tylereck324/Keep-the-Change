'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CategoryBreakdownChartProps {
  data: Array<{
    categoryName: string
    budgeted: number
    spent: number
    percentUsed: number
  }>
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="categoryName"
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
            <Bar dataKey="budgeted" fill="#9ca3af" name="Budgeted" />
            <Bar dataKey="spent" fill="#3b82f6" name="Spent" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
