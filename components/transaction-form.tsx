'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTransaction, updateTransaction, TransactionWithCategory } from '@/lib/actions/transactions'
import { createCategory } from '@/lib/actions/categories'
import { Category } from '@/lib/types'
import { BudgetWarning } from '@/components/budget-warning'
import {
  wouldExceedBudget,
  getSortedCategorySuggestions,
} from '@/lib/utils/budget-warnings'

interface TransactionFormProps {
  categories: Category[]
  transaction?: TransactionWithCategory
  trigger: React.ReactNode
  onSuccess?: () => void
  budgetMap?: Record<string, number>
  spentMap?: Record<string, number>
}

export function TransactionForm({ categories, transaction, trigger, onSuccess, budgetMap, spentMap }: TransactionFormProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '')
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '')
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [date, setDate] = useState(
    transaction?.date ?? new Date().toISOString().split('T')[0]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showWarning, setShowWarning] = useState(false)
  const [warningData, setWarningData] = useState<{
    categoryName: string
    overage: number
  } | null>(null)
  const [warningDismissed, setWarningDismissed] = useState(false)

  const isEditing = !!transaction

  // Reset warning dismissed flag when category changes
  useEffect(() => {
    setWarningDismissed(false)
  }, [categoryId])

  // Check for budget warnings when amount or category changes
  useEffect(() => {
    // Only check warnings if budgetMap and spentMap are provided
    if (!budgetMap || !spentMap) {
      setShowWarning(false)
      setWarningData(null)
      return
    }

    if (!amount || !categoryId) {
      setShowWarning(false)
      setWarningData(null)
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setShowWarning(false)
      setWarningData(null)
      return
    }

    const budgeted = budgetMap[categoryId] ?? 0
    const spent = spentMap[categoryId] ?? 0

    // Only show warning if budget is set
    if (budgeted === 0) {
      setShowWarning(false)
      setWarningData(null)
      return
    }

    // Don't show warning if user has dismissed it
    if (warningDismissed) {
      setShowWarning(false)
      setWarningData(null)
      return
    }

    const { wouldExceed, overage } = wouldExceedBudget(numAmount, budgeted, spent)

    if (wouldExceed) {
      const category = categories.find((c) => c.id === categoryId)
      setShowWarning(true)
      setWarningData({
        categoryName: category?.name ?? 'Unknown',
        overage,
      })
    } else {
      setShowWarning(false)
      setWarningData(null)
    }
  }, [amount, categoryId, budgetMap, spentMap, categories, warningDismissed])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (!categoryId) {
      setError('Please select a category')
      return
    }

    setLoading(true)

    try {
      if (isEditing) {
        await updateTransaction(transaction.id, {
          categoryId,
          amount: numAmount,
          description: description.trim() || undefined,
          date,
        })
      } else {
        await createTransaction({
          categoryId,
          amount: numAmount,
          description: description.trim() || undefined,
          date,
        })
      }
      setOpen(false)
      resetForm()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    setLoading(true)
    try {
      const newCategory = await createCategory(newCategoryName.trim(), '#6366f1')
      setCategoryId(newCategory.id)
      setShowNewCategory(false)
      setNewCategoryName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchCategory = (newCategoryId: string) => {
    setCategoryId(newCategoryId)
    // Warning will automatically update via useEffect
  }

  const handleKeepCategory = () => {
    setShowWarning(false)
    setWarningDismissed(true)
  }

  const resetForm = () => {
    setAmount('')
    setCategoryId('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setError('')
    setShowNewCategory(false)
    setNewCategoryName('')
    setShowWarning(false)
    setWarningData(null)
    setWarningDismissed(false)
  }

  const suggestions = showWarning && budgetMap && spentMap
    ? getSortedCategorySuggestions(categories, budgetMap, spentMap, categoryId)
    : []

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            {showNewCategory ? (
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                />
                <Button type="button" onClick={handleCreateCategory} disabled={loading}>
                  Add
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowNewCategory(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded"
                    onClick={() => setShowNewCategory(true)}
                  >
                    + New Category
                  </button>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Budget Warning */}
          {showWarning && warningData && (
            <BudgetWarning
              categoryName={warningData.categoryName}
              overage={warningData.overage}
              suggestions={suggestions}
              onKeep={handleKeepCategory}
              onSwitchCategory={handleSwitchCategory}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Transaction'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
