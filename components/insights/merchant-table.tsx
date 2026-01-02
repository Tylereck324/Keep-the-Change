'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MerchantInsight } from '@/lib/actions/insights'

interface MerchantTableProps {
  data: MerchantInsight[]
}

type SortKey = 'displayName' | 'totalSpent' | 'transactionCount' | 'averageAmount'
type SortOrder = 'asc' | 'desc'

export function MerchantTable({ data }: MerchantTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalSpent')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    let comparison = 0
    switch (sortKey) {
      case 'displayName':
        comparison = a.displayName.localeCompare(b.displayName)
        break
      case 'totalSpent':
        comparison = a.totalSpent - b.totalSpent
        break
      case 'transactionCount':
        comparison = a.transactionCount - b.transactionCount
        break
      case 'averageAmount':
        comparison = a.averageAmount - b.averageAmount
        break
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const renderSortIcon = (column: SortKey) => {
    if (sortKey !== column) {
      return <span className="text-muted-foreground ml-1">↕</span>
    }
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Merchant Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-foreground">
            <thead>
              <tr className="border-b border-border">
                <th
                  className="text-left py-2 px-2 cursor-pointer hover:bg-muted font-semibold"
                  onClick={() => handleSort('displayName')}
                >
                  Merchant{renderSortIcon('displayName')}
                </th>
                <th
                  className="text-right py-2 px-2 cursor-pointer hover:bg-muted font-semibold"
                  onClick={() => handleSort('totalSpent')}
                >
                  Total Spent{renderSortIcon('totalSpent')}
                </th>
                <th
                  className="text-right py-2 px-2 cursor-pointer hover:bg-muted font-semibold"
                  onClick={() => handleSort('transactionCount')}
                >
                  Transactions{renderSortIcon('transactionCount')}
                </th>
                <th
                  className="text-right py-2 px-2 cursor-pointer hover:bg-muted font-semibold"
                  onClick={() => handleSort('averageAmount')}
                >
                  Avg Amount{renderSortIcon('averageAmount')}
                </th>
                <th className="text-left py-2 px-2 font-semibold">Category</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((merchant, index) => (
                <tr key={merchant.merchant} className="border-b border-border hover:bg-muted/50">
                  <td className="py-2 px-2">
                    <span className="font-medium">{merchant.displayName}</span>
                  </td>
                  <td className="text-right py-2 px-2 font-semibold">
                    ${merchant.totalSpent.toFixed(2)}
                  </td>
                  <td className="text-right py-2 px-2">
                    {merchant.transactionCount}
                  </td>
                  <td className="text-right py-2 px-2 text-muted-foreground">
                    ${merchant.averageAmount.toFixed(2)}
                  </td>
                  <td className="py-2 px-2">
                    {merchant.primaryCategory ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: merchant.primaryCategory.color }}
                        />
                        <span className="text-sm">{merchant.primaryCategory.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Uncategorized</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
