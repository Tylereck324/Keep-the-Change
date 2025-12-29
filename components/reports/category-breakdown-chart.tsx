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
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="categoryName"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number | undefined) => value !== undefined ? `$${value.toFixed(2)}` : '$0.00'}
            />
            <Legend />
            <Bar dataKey="budgeted" fill="hsl(var(--muted))" name="Budgeted" />
            <Bar dataKey="spent" fill="hsl(var(--primary))" name="Spent" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
