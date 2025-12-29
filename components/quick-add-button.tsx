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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTransaction } from '@/lib/actions/transactions'
import { Category } from '@/lib/types'
import { BudgetWarning } from '@/components/budget-warning'
import {
  wouldExceedBudget,
  getSortedCategorySuggestions,
} from '@/lib/utils/budget-warnings'

interface QuickAddButtonProps {
  categories: Category[]
  budgetMap: Map<string, number>
  spentMap: Map<string, number>
}

export function QuickAddButton({ categories, budgetMap, spentMap }: QuickAddButtonProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showWarning, setShowWarning] = useState(false)
  const [warningData, setWarningData] = useState<{
    categoryName: string
    overage: number
  } | null>(null)

  // Check for budget warnings when amount or category changes
  useEffect(() => {
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

    const budgeted = budgetMap.get(categoryId) ?? 0
    const spent = spentMap.get(categoryId) ?? 0

    // Only show warning if budget is set
    if (budgeted === 0) {
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
  }, [amount, categoryId, budgetMap, spentMap, categories])

  const resetForm = () => {
    setAmount('')
    setCategoryId('')
    setDescription('')
    setError('')
    setShowWarning(false)
    setWarningData(null)
  }

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
      await createTransaction({
        categoryId,
        amount: numAmount,
        description: description.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
      })
      setOpen(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
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
  }

  const suggestions = showWarning
    ? getSortedCategorySuggestions(categories, budgetMap, spentMap, categoryId)
    : []

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center md:bottom-4"
        aria-label="Quick add transaction"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Quick Add Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Add Transaction</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
              <Label htmlFor="quick-amount">Amount</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="quick-amount"
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
                </SelectContent>
              </Select>
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
              <Label htmlFor="quick-description">Description (optional)</Label>
              <Input
                id="quick-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
                maxLength={100}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
