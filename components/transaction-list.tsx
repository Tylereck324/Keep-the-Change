'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { TransactionForm } from './transaction-form'
import { deleteTransaction, TransactionWithCategory } from '@/lib/actions/transactions'
import { Category } from '@/lib/types'

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
  budgetMap?: Record<string, number>
  spentMap?: Record<string, number>
}

export function TransactionList({ transactions, categories, budgetMap, spentMap }: TransactionListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await deleteTransaction(id)
      toast.success('Transaction deleted')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      toast.error(message)
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
          <CardContent className="flex items-center justify-between py-4 px-4">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: transaction.category?.color ?? '#64748b' }}
                aria-hidden="true"
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
                trigger={
                  <Button variant="ghost" size="sm" aria-label={`Edit transaction: $${transaction.amount.toFixed(2)}`}>
                    Edit
                  </Button>
                }
                budgetMap={budgetMap}
                spentMap={spentMap}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleting === transaction.id}
                    aria-label={`Delete transaction: $${transaction.amount.toFixed(2)}`}
                  >
                    {deleting === transaction.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the ${transaction.amount.toFixed(2)} transaction
                      {transaction.description ? ` for "${transaction.description}"` : ''}.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(transaction.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
