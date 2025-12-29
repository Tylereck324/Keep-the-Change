# Smart Budget Warnings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real-time budget warnings when adding transactions that would exceed category budgets, with smart category switching suggestions.

**Architecture:** Client-side React components calculate budget status in real-time based on current month's budgets and transactions. Warning component shows overage amount and suggests alternative categories sorted by available budget.

**Tech Stack:** Next.js 16, TypeScript, React, shadcn/ui, Tailwind CSS

---

## Task 1: Create Budget Calculation Utilities

**Files:**
- Create: `lib/utils/budget-warnings.ts`

**Step 1: Create utility file with budget status calculation**

Create `lib/utils/budget-warnings.ts`:

```typescript
import { Category } from '@/lib/types'

export type BudgetStatus = {
  categoryId: string
  categoryName: string
  categoryColor: string
  budgeted: number
  spent: number
  remaining: number
  percentUsed: number
  indicator: 'green' | 'yellow' | 'red'
}

export type CategorySuggestion = BudgetStatus & {
  category: Category
}

/**
 * Calculate budget status for a single category
 */
export function calculateBudgetStatus(
  category: Category,
  budgeted: number,
  spent: number
): BudgetStatus {
  const remaining = budgeted - spent
  const percentUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0

  let indicator: 'green' | 'yellow' | 'red'
  const percentRemaining = 100 - percentUsed

  if (percentRemaining > 50) {
    indicator = 'green'
  } else if (percentRemaining >= 20) {
    indicator = 'yellow'
  } else {
    indicator = 'red'
  }

  return {
    categoryId: category.id,
    categoryName: category.name,
    categoryColor: category.color,
    budgeted,
    spent,
    remaining,
    percentUsed,
    indicator,
  }
}

/**
 * Get sorted category suggestions (most available budget first)
 */
export function getSortedCategorySuggestions(
  categories: Category[],
  budgetMap: Map<string, number>,
  spentMap: Map<string, number>,
  excludeCategoryId?: string
): CategorySuggestion[] {
  return categories
    .filter((cat) => cat.id !== excludeCategoryId)
    .map((cat) => {
      const budgeted = budgetMap.get(cat.id) ?? 0
      const spent = spentMap.get(cat.id) ?? 0
      const status = calculateBudgetStatus(cat, budgeted, spent)

      return {
        ...status,
        category: cat,
      }
    })
    .sort((a, b) => b.remaining - a.remaining) // Sort by most available first
}

/**
 * Check if adding amount to category would exceed budget
 */
export function wouldExceedBudget(
  amount: number,
  budgeted: number,
  spent: number
): { wouldExceed: boolean; overage: number } {
  const newSpent = spent + amount
  const wouldExceed = newSpent > budgeted
  const overage = wouldExceed ? newSpent - budgeted : 0

  return { wouldExceed, overage }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add lib/utils/budget-warnings.ts
git commit -m "feat: add budget calculation utilities"
```

---

## Task 2: Create Category Suggestion Component

**Files:**
- Create: `components/category-suggestion.tsx`

**Step 1: Create CategorySuggestion component**

Create `components/category-suggestion.tsx`:

```typescript
'use client'

import { CategorySuggestion as CategorySuggestionType } from '@/lib/utils/budget-warnings'

interface CategorySuggestionProps {
  suggestion: CategorySuggestionType
  onSelect: () => void
}

export function CategorySuggestion({ suggestion, onSelect }: CategorySuggestionProps) {
  const indicatorEmoji = {
    green: '🟢',
    yellow: '🟡',
    red: '🔴',
  }[suggestion.indicator]

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center justify-between p-2 rounded hover:bg-accent transition-colors text-left"
    >
      <div className="flex items-center gap-2">
        <span>{indicatorEmoji}</span>
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: suggestion.categoryColor }}
        />
        <span className="font-medium">{suggestion.categoryName}</span>
      </div>
      <span className="text-sm text-muted-foreground">
        ${suggestion.remaining.toFixed(2)} left
      </span>
    </button>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add components/category-suggestion.tsx
git commit -m "feat: add category suggestion component"
```

---

## Task 3: Create Budget Warning Component

**Files:**
- Create: `components/budget-warning.tsx`

**Step 1: Create BudgetWarning component**

Create `components/budget-warning.tsx`:

```typescript
'use client'

import { Category } from '@/lib/types'
import { CategorySuggestion as CategorySuggestionType } from '@/lib/utils/budget-warnings'
import { CategorySuggestion } from './category-suggestion'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'

interface BudgetWarningProps {
  categoryName: string
  overage: number
  suggestions: CategorySuggestionType[]
  onKeep: () => void
  onSwitchCategory: (categoryId: string) => void
}

export function BudgetWarning({
  categoryName,
  overage,
  suggestions,
  onKeep,
  onSwitchCategory,
}: BudgetWarningProps) {
  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <AlertDescription>
        <div className="space-y-3">
          {/* Warning Message */}
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">
                This will exceed your {categoryName} budget by ${overage.toFixed(2)}
              </p>
              {suggestions.length > 0 && (
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  Suggest using a different category?
                </p>
              )}
            </div>
          </div>

          {/* Category Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <CategorySuggestion
                  key={suggestion.categoryId}
                  suggestion={suggestion}
                  onSelect={() => onSwitchCategory(suggestion.categoryId)}
                />
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onKeep}
              className="flex-1"
            >
              Keep {categoryName}
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
```

**Step 2: Check if Alert component exists**

Run: `ls components/ui/alert.tsx`
Expected: If file doesn't exist, install it

If alert doesn't exist, run:
```bash
npx shadcn@latest add alert -y
```

**Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add components/budget-warning.tsx components/ui/alert.tsx
git commit -m "feat: add budget warning component"
```

---

## Task 4: Add Server Action to Get Budget Data

**Files:**
- Modify: `lib/actions/budgets.ts`

**Step 1: Add function to get budget status for current month**

Add to `lib/actions/budgets.ts`:

```typescript
export async function getBudgetDataForWarnings(): Promise<{
  budgetMap: Map<string, number>
  spentMap: Map<string, number>
}> {
  const householdId = await getSession()
  if (!householdId) {
    return { budgetMap: new Map(), spentMap: new Map() }
  }

  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

  // Get budgets for current month
  const budgets = await getMonthlyBudgets(currentMonth)
  const budgetMap = new Map(budgets.map((b) => [b.category_id, b.budgeted_amount]))

  // Get transactions for current month
  const { getTransactionsByMonth } = await import('./transactions')
  const transactions = await getTransactionsByMonth(currentMonth)

  // Calculate spent per category
  const spentMap = new Map<string, number>()
  transactions.forEach((t) => {
    const current = spentMap.get(t.category_id) ?? 0
    spentMap.set(t.category_id, current + t.amount)
  })

  return { budgetMap, spentMap }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add lib/actions/budgets.ts
git commit -m "feat: add server action for budget warning data"
```

---

## Task 5: Integrate Budget Warning into QuickAddButton

**Files:**
- Modify: `components/quick-add-button.tsx`
- Modify: `components/quick-add-wrapper.tsx`

**Step 1: Modify QuickAddWrapper to fetch budget data**

In `components/quick-add-wrapper.tsx`, update to pass budget data:

```typescript
import { getCategories } from '@/lib/actions/categories'
import { getBudgetDataForWarnings } from '@/lib/actions/budgets'
import { getSession } from '@/lib/auth'
import { QuickAddButton } from './quick-add-button'

export async function QuickAddWrapper() {
  const session = await getSession()

  // Only show if authenticated
  if (!session) return null

  const [categories, budgetData] = await Promise.all([
    getCategories(),
    getBudgetDataForWarnings(),
  ])

  // Only show if there are categories
  if (categories.length === 0) return null

  return (
    <QuickAddButton
      categories={categories}
      budgetMap={budgetData.budgetMap}
      spentMap={budgetData.spentMap}
    />
  )
}
```

**Step 2: Update QuickAddButton to use budget warnings**

In `components/quick-add-button.tsx`, add budget warning logic:

```typescript
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
```

**Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add components/quick-add-button.tsx components/quick-add-wrapper.tsx
git commit -m "feat: integrate budget warnings into quick add button"
```

---

## Task 6: Integrate Budget Warning into TransactionForm

**Files:**
- Modify: `components/transaction-form.tsx`
- Modify: `app/transactions/page.tsx`

**Step 1: Update TransactionForm component**

In `components/transaction-form.tsx`, add budget warning support (similar pattern to QuickAddButton):

Add props:
```typescript
interface TransactionFormProps {
  categories: Category[]
  transaction?: TransactionWithCategory
  trigger: React.ReactNode
  onSuccess?: () => void
  budgetMap?: Map<string, number>
  spentMap?: Map<string, number>
}
```

Add state and logic similar to QuickAddButton (budget warning useEffect, handlers, etc.)

Insert BudgetWarning component after category selector, before description field.

**Step 2: Update transactions page to pass budget data**

In `app/transactions/page.tsx`, fetch and pass budget data to TransactionForm.

**Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add components/transaction-form.tsx app/transactions/page.tsx
git commit -m "feat: integrate budget warnings into transaction form"
```

---

## Task 7: Final Testing and Polish

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings

**Step 2: Manual testing checklist**

Test these scenarios:
1. Quick Add: Enter amount that would exceed budget → warning appears
2. Quick Add: Switch to suggested category → warning disappears
3. Quick Add: Click "Keep Category" → warning dismisses, can still submit
4. Transaction Form: Same warning behavior as Quick Add
5. No budget set → no warning shown
6. All categories over budget → warning still shows all options in red

**Step 3: Fix any issues found**

If issues found, fix and commit individually.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete smart budget warnings feature"
```

---

## Summary

This implementation adds real-time budget warnings to both the Quick Add button and Transaction Form. When a user enters an amount that would exceed a category's budget, they see:

1. Clear warning message with overage amount
2. Sorted list of alternative categories with available budgets
3. Visual indicators (🟢🟡🔴) showing budget health
4. One-tap category switching
5. Option to override and keep original category

The feature is non-blocking, user-friendly, and helps prevent overspending while maintaining flexibility.
