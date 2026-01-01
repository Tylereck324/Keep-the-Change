'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { formatMoney, dollarsToCents } from '@/lib/utils/money'

interface Transaction {
  id: string
  amount: number
  amount_cents?: number
  description: string | null
  date: string
  category: {
    name: string
    color: string
  } | null
}

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const groupByDate = (txns: Transaction[]) => {
    const groups: { [key: string]: Transaction[] } = {}

    txns.forEach((txn) => {
      const date = new Date(txn.date)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let label: string
      if (date.toDateString() === today.toDateString()) {
        label = 'Today'
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday'
      } else {
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }

      if (!groups[label]) {
        groups[label] = []
      }
      groups[label].push(txn)
    })

    return groups
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No transactions yet. Start tracking your spending!
          </p>
        </CardContent>
      </Card>
    )
  }

  const grouped = groupByDate(transactions)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        <Link href="/transactions" className="text-sm text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, txns]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">{date}</p>
              <div className="space-y-2">
                {txns.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: txn.category?.color ?? '#64748b' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {txn.description || txn.category?.name || 'Transaction'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {txn.category?.name || 'Uncategorized'}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold flex-shrink-0 ml-2">
                      {formatMoney(txn.amount_cents ?? dollarsToCents(txn.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
