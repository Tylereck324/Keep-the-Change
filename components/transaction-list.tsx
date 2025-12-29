'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TransactionForm } from './transaction-form'
import { deleteTransaction, TransactionWithCategory } from '@/lib/actions/transactions'
import { Category } from '@/lib/types'

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
}

export function TransactionList({ transactions, categories }: TransactionListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return

    setDeleting(id)
    try {
      await deleteTransaction(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  if (transactions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No transactions yet. Add your first one!
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <Card key={transaction.id}>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: transaction.category?.color ?? '#64748b' }}
              />
              <div>
                <p className="font-medium">
                  ${transaction.amount.toFixed(2)}
                  {transaction.description && (
                    <span className="text-muted-foreground font-normal ml-2">
                      {transaction.description}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {transaction.category?.name ?? 'Uncategorized'} •{' '}
                  {new Date(transaction.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <TransactionForm
                categories={categories}
                transaction={transaction}
                trigger={<Button variant="ghost" size="sm">Edit</Button>}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(transaction.id)}
                disabled={deleting === transaction.id}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
