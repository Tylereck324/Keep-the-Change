'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CategoryForm } from './category-form'
import { DeleteCategoryDialog } from './delete-category-dialog'
import { BudgetAmountInput } from './budget-amount-input'
import { Category, MonthlyBudget } from '@/lib/types'
import { deleteCategory } from '@/lib/actions/categories'
import { toast } from 'sonner'

interface BudgetCategoryRowProps {
  category: Category
  budget?: MonthlyBudget
  month: string
}

export function BudgetCategoryRow({ category, budget, month }: BudgetCategoryRowProps) {
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const handleArchive = async () => {
    setArchiving(true)
    try {
      await deleteCategory(category.id)
      toast.success('Category archived')
      setArchiveDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive')
    } finally {
      setArchiving(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="font-medium">{category.name}</span>
          <div className="flex gap-1">
            <CategoryForm
              category={category}
              trigger={
                <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    <path d="m15 5 4 4"/>
                  </svg>
                  <span className="sr-only">Edit</span>
                </button>
              }
            />
            <DeleteCategoryDialog
              open={archiveDialogOpen}
              onOpenChange={setArchiveDialogOpen}
              trigger={
                <button 
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-muted"
                  disabled={archiving}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                    <path d="M10 12h4"/>
                  </svg>
                  <span className="sr-only">Archive</span>
                </button>
              }
              onConfirm={handleArchive}
              loading={archiving}
            />
          </div>
        </div>
        <BudgetAmountInput
          categoryId={category.id}
          month={month}
          initialAmount={budget?.budgeted_amount ?? 0}
        />
      </CardContent>
    </Card>
  )
}
